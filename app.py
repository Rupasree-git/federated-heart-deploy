import torch
import torch.nn as nn
import numpy as np
import pandas as pd
import joblib
import json
import warnings
from flask import Flask, request, jsonify, render_template

warnings.filterwarnings("ignore", category=UserWarning, module="sklearn")

# --- Monkey-patch for monotonic_cst compatibility ---
import sklearn.tree
import sklearn.ensemble._forest

def patch_monotonic_cst():
    classes_to_patch = [
        sklearn.tree.DecisionTreeClassifier,
        sklearn.tree.DecisionTreeRegressor,
        sklearn.ensemble._forest.RandomForestClassifier,
    ]
    for cls in classes_to_patch:
        if not hasattr(cls, "monotonic_cst"):
            cls.monotonic_cst = None

patch_monotonic_cst()

# ---------------------------
# Model Definition (with BatchNorm)
# ---------------------------
class HeartMLP(nn.Module):
    def __init__(self, input_dim=6, hidden_dims=[64, 128, 64], dropout=0.3):
        super().__init__()
        layers = []
        prev_dim = input_dim
        for h in hidden_dims:
            layers.extend([
                nn.Linear(prev_dim, h),
                nn.BatchNorm1d(h),
                nn.ReLU(),
                nn.Dropout(dropout)
            ])
            prev_dim = h
        layers.append(nn.Linear(prev_dim, 1))
        layers.append(nn.Sigmoid())
        self.net = nn.Sequential(*layers)

    def forward(self, x):
        return self.net(x)

# ---------------------------
# Load Artifacts
# ---------------------------
device = torch.device("cpu")
scaler = joblib.load("dp_fedprox_scaler.pkl")
meta_model = joblib.load("dp_meta_ensemble.pkl")

personalized_models = []
for name in ['A', 'B', 'C']:
    state_dict = torch.load(f"dp_fedprox_personalized_{name}.pth", map_location=device)
    model = HeartMLP().to(device)
    model.load_state_dict(state_dict, strict=False)
    model.eval()
    personalized_models.append(model)

FEATURES = ['age', 'systolic_bp', 'bmi', 'chest_pain', 'shortness_of_breath', 'smoker']

# ---------------------------
# Flask App
# ---------------------------
app = Flask(__name__)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/favicon.ico')
def favicon():
    return '', 204

@app.route('/predict', methods=['POST'])
def predict():
    try:
        data = request.get_json(force=True)
        print("Received payload:", data)

        input_vec = np.array([[float(data[f]) for f in FEATURES]])
        input_scaled = scaler.transform(input_vec)
        input_tensor = torch.tensor(input_scaled, dtype=torch.float32).to(device)

        # Expert predictions and confidences
        expert_preds = []
        expert_confs = []
        for model in personalized_models:
            with torch.no_grad():
                prob = model(input_tensor).squeeze().cpu().item()
                expert_preds.append(1 if prob > 0.5 else 0)
                expert_confs.append(prob)

        # Trust weights for each hospital (from training history)
        trust_weights = [0.94, 0.82, 0.87]

        # --- Compute federated risk score (weighted consensus) ---
        weighted_sum = 0.0
        total_weight = 0.0
        for pred, conf, trust in zip(expert_preds, expert_confs, trust_weights):
            # Weighted contribution: prediction (0/1) * confidence * trust
            weighted_sum += pred * conf * trust
            total_weight += conf * trust

        # Normalize to get a risk probability between 0 and 1
        if total_weight > 0:
            federated_prob = weighted_sum / total_weight
        else:
            federated_prob = 0.0

        federated_prob = float(np.clip(federated_prob, 0.0, 1.0))

        # --- Clinical Safety Override ---
        # If at least two experts confidently predict HIGH, elevate risk
        confident_high_votes = sum(
            1 for v, c in zip(expert_preds, expert_confs) if v == 1 and c > 0.5
        )
        if confident_high_votes >= 2:
            final_pred = 1
            final_proba = max(federated_prob, 0.75)
        else:
            final_pred = 1 if federated_prob >= 0.5 else 0
            final_proba = federated_prob

        print(f"Expert preds: {expert_preds}, confs: {[round(c,3) for c in expert_confs]}")
        print(f"Federated prob: {federated_prob:.4f} → Final: {final_pred} ({final_proba:.4f})")

        return jsonify({
            'prediction': 'HIGH' if final_pred == 1 else 'LOW',
            'probability': final_proba,
            'expert_votes': expert_preds,
            'expert_confidences': expert_confs
        })
    except Exception as e:
        print("ERROR:", str(e))
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 400

@app.route('/audit/latest')
def latest_audit():
    try:
        with open('blockchain_audit_trail.json', 'r') as f:
            chain = json.load(f)
        for block in chain[-3:]:
            block['event'] = f"Round {block['data']['round']} Aggregation"
        return jsonify(chain[-3:])
    except:
        return jsonify([])

if __name__ == '__main__':
    app.run(debug=False, host='0.0.0.0', port=5000)