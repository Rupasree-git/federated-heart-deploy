# FedHeart-Secure: Privacy-Preserving Federated Learning for Cardiovascular Risk Triage

[![Python 3.10+](https://img.shields.io/badge/python-3.10+-blue.svg)](https://www.python.org/downloads/)
[![PyTorch](https://img.shields.io/badge/PyTorch-2.4.0-red.svg)](https://pytorch.org/)
[![Flask](https://img.shields.io/badge/Flask-2.3.3-green.svg)](https://flask.palletsprojects.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

FedHeart-Secure is a comprehensive federated learning framework for privacy-preserving cardiovascular risk triage across heterogeneous hospital environments. It combines differential privacy, trust-weighted aggregation, personalized fine-tuning, a calibrated meta-ensemble, and a blockchain audit trail to deliver near-centralized accuracy (79.6%) while complying with GDPR and HIPAA principles.

![System Architecture](docs/architecture.png)

---

## Key Features

- Federated Learning Simulation: Three simulated hospitals (Cardiology, Geriatric, General Practice) with non-IID real-world datasets.
- Label Harmonization: Ordinal prototype-based alignment to unify binary and 3-class risk labels.
- Differential Privacy (DP-SGD): Formal epsilon-DP guarantees (epsilon <= 8) via Opacus integration.
- DP-FedProx with Trust-Weighted Aggregation: Mitigates client drift and adaptively weights contributions based on validation AUC.
- Personalized Fine-Tuning: Improves local recall for high-risk patients (up to +657% at Hospital C).
- Calibrated Meta-Ensemble: Stacked RandomForest with Platt scaling achieves 79.6% test accuracy.
- Blockchain Audit Trail: Immutable ledger logs federated rounds, trust updates, and privacy expenditure.
- Clinical Dashboard: Flask-based interface with real-time triage, expert consensus visualization, and audit viewer.

---

## Repository Structure

```
federated-heart-deploy/
├── app.py
├── requirements.txt
├── federated_training.ipynb
│
├── models/
│   ├── dp_fedprox_scaler.pkl
│   ├── dp_meta_ensemble.pkl
│   ├── dp_fedprox_personalized_A.pth
│   ├── dp_fedprox_personalized_B.pth
│   └── dp_fedprox_personalized_C.pth
│
├── blockchain_final_audit.json
│
├── templates/
│   └── index.html
│
└── static/
    ├── css/
    │   └── styles.css
    └── js/
        └── script.js
```

---

## Quick Start

### Clone the repository

```bash
git clone https://github.com/Rupasree-git/federated-heart-deploy.git
cd federated-heart-deploy
```

### Install dependencies

```bash
pip install -r requirements.txt
```

### Add model artifacts

Ensure the following files exist inside the `models/` directory:

- dp_fedprox_scaler.pkl
- dp_meta_ensemble.pkl
- dp_fedprox_personalized_A.pth
- dp_fedprox_personalized_B.pth
- dp_fedprox_personalized_C.pth

### Run the application

```bash
python app.py
```

Open the application at:

```
http://localhost:5000
```

---

## Training Pipeline

The notebook `federated_training.ipynb` contains the full training workflow:

1. Data preprocessing for three hospital datasets
2. Differentially private federated training (DP-FedProx)
3. Trust-weighted aggregation
4. Personalized fine-tuning
5. Meta-ensemble training
6. Blockchain audit generation

Run using Google Colab with GPU support.

---

## Performance Summary

| Method                                   | Average Accuracy |
|------------------------------------------|------------------|
| Isolated Local                           | 65.2%            |
| Federated (DP-FedProx) Global            | 62.1%            |
| Federated Personalized                   | 67.6%            |
| Federated Meta-Ensemble (Proposed)       | 79.6%            |
| Centralized (Upper Bound)                | 82.0%            |

Recall improvement after personalization (Hospital C):  
10.5% -> 79.5% (+657%)

Privacy budget (final epsilon):  
Hospital A: 7.89  
Hospital B: 1.43  
Hospital C: 3.95  

---

## API Endpoints

| Endpoint        | Method | Description |
|----------------|--------|-------------|
| /              | GET    | Serves dashboard UI |
| /predict       | POST   | Returns prediction and expert outputs |
| /audit/latest  | GET    | Returns latest blockchain records |

---

## License

This project is licensed under the MIT License. See the LICENSE file for details.

---

## Citation

```
@article{chakraborty2026fedheart,
  title={Federated Expert Systems for Decentralized Decision-Making in Privacy-Sensitive Domains},
  author={Rupasree Chakraborty},
  journal={Bachelor's Thesis, University of Engineering and Management, Kolkata},
  year={2026}
}
```

---

## Acknowledgments

University of Engineering and Management, Kolkata  
Supervisor: Prof. Debdatta Chatterjee  
Datasets: UCI Heart Disease, Framingham Heart Study, PIMA Indians Diabetes
