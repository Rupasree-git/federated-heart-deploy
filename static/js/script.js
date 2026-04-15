(function() {
    'use strict';
    
    // ----- DOM Elements -----
    const ageInput = document.getElementById('ageInput');
    const bpInput = document.getElementById('bpInput');
    const bmiInput = document.getElementById('bmiInput');
    const chestPainCheck = document.getElementById('chestPainCheck');
    const sobCheck = document.getElementById('sobCheck');
    const smokerCheck = document.getElementById('smokerCheck');
    const runButton = document.getElementById('runTriageBtn');
    const sampleBtn = document.getElementById('samplePatientBtn');
    
    const confidenceCircle = document.getElementById('confidenceCircle');
    const confidencePercent = document.getElementById('confidencePercent');
    const riskBadge = document.getElementById('riskBadge');
    const riskBadgeText = document.getElementById('riskBadgeText');
    const recTitle = document.getElementById('recTitle');
    const recDesc = document.getElementById('recDesc');
    
    const expertCards = [
        document.getElementById('expertCardA'),
        document.getElementById('expertCardB'),
        document.getElementById('expertCardC')
    ];
    
    // Section elements for scrolling
    const sections = {
        'risk-triage': null, // top of page
        'patient-input': document.getElementById('patient-input-section'),
        'expert-consensus': document.getElementById('expert-consensus-section'),
        'privacy-audit': document.getElementById('privacy-audit-section'),
        'explainability': document.getElementById('explainability-section')
    };
    
    // ----- Helper: Get form data -----
    function getFormData() {
        return {
            age: parseFloat(ageInput.value) || 62,
            systolic_bp: parseFloat(bpInput.value) || 145,
            bmi: parseFloat(bmiInput.value) || 28.4,
            chest_pain: chestPainCheck.checked ? 1 : 0,
            shortness_of_breath: sobCheck.checked ? 1 : 0,
            smoker: smokerCheck.checked ? 1 : 0
        };
    }
    
    // ----- Update UI with prediction -----
    function updateUI(data) {
        // Clamp probability between 0 and 1 just in case
        let prob = Math.min(1, Math.max(0, data.probability));
        const pred = data.prediction;
        const pct = Math.round(prob * 100);
        
        // Update percentage text
        if (confidencePercent) confidencePercent.textContent = pct + '%';
        
        // Update circle progress and color
        if (confidenceCircle) {
            const circumference = 2 * Math.PI * 70;
            const offset = circumference - (prob * circumference);
            confidenceCircle.style.strokeDashoffset = offset;
            
            confidenceCircle.classList.remove('text-error', 'text-primary', 'text-on-surface');
            confidenceCircle.classList.add(pred === 'HIGH' ? 'text-error' : 'text-primary');
        }
        
        // Update risk badge
        if (riskBadge && riskBadgeText) {
            riskBadge.className = riskBadge.className.replace(/bg-\S+/, pred === 'HIGH' ? 'bg-error-container' : 'bg-primary-container');
            riskBadge.className = riskBadge.className.replace(/text-\S+/, pred === 'HIGH' ? 'text-on-error-container' : 'text-on-primary-container');
            const icon = riskBadge.querySelector('.material-symbols-outlined');
            if (icon) icon.textContent = pred === 'HIGH' ? 'warning' : 'check_circle';
            riskBadgeText.textContent = pred === 'HIGH' ? 'High Risk Detected' : 'Low Risk Assessed';
        }
        
        // Update recommendation
        if (recTitle) recTitle.textContent = pred === 'HIGH' ? 'Priority Clinical Intervention Recommended' : 'Routine Monitoring Appropriate';
        if (recDesc) recDesc.textContent = pred === 'HIGH' 
            ? 'Consensus suggests elevated cardiovascular risk. Immediate cardiology consultation advised.'
            : 'Federated consensus indicates low short‑term risk. Continue standard preventive care.';
        
        // Update expert cards
        const experts = [
            { pred: data.expert_votes[0], conf: data.expert_confidences[0], trust: 0.94 },
            { pred: data.expert_votes[1], conf: data.expert_confidences[1], trust: 0.82 },
            { pred: data.expert_votes[2], conf: data.expert_confidences[2], trust: 0.87 }
        ];
        
        experts.forEach((exp, idx) => {
            const card = expertCards[idx];
            if (!card) return;
            const predSpan = card.querySelector('.expert-pred');
            const confSpan = card.querySelector('.expert-conf');
            const trustSpan = card.querySelector('.expert-trust');
            const borderDiv = card.querySelector('.absolute.top-0.right-0');
            
            if (predSpan) {
                predSpan.textContent = exp.pred === 1 ? 'High' : 'Low';
                predSpan.className = predSpan.className.replace(/text-\S+/, exp.pred === 1 ? 'text-error' : 'text-on-surface');
            }
            if (confSpan) confSpan.textContent = `Conf: ${exp.conf.toFixed(2)}`;
            if (trustSpan) trustSpan.textContent = `Trust: ${exp.trust.toFixed(2)}`;
            if (borderDiv) {
                borderDiv.className = borderDiv.className.replace(/bg-\S+\/\d+/, exp.pred === 1 ? 'bg-error/50' : 'bg-primary/20');
            }
        });
    }
    
    // ----- Run prediction -----
    async function runPrediction() {
        const originalHTML = runButton.innerHTML;
        runButton.disabled = true;
        runButton.innerHTML = '<span class="material-symbols-outlined animate-spin">progress_activity</span> Processing...';
        
        try {
            const payload = getFormData();
            console.log('Sending payload:', payload);
            
            const response = await fetch('/predict', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            
            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || `HTTP ${response.status}`);
            }
            
            const data = await response.json();
            
console.log('Raw response:', data);  // Add this line

            updateUI(data);
        } catch (error) {
            console.error('Prediction failed:', error);
            alert('Triage failed: ' + error.message);
        } finally {
            runButton.disabled = false;
            runButton.innerHTML = originalHTML;
        }
    }
    
    // ----- Prefill sample patient -----
    function prefillSample() {
        ageInput.value = 72;
        bpInput.value = 168;
        bmiInput.value = 31.2;
        chestPainCheck.checked = true;
        sobCheck.checked = true;
        smokerCheck.checked = true;
    }
    
    // ----- Load blockchain audit -----
    async function loadAuditTrail() {
        try {
            const res = await fetch('/audit/latest');
            const blocks = await res.json();
            const tbody = document.querySelector('table tbody');
            if (!tbody) return;
            tbody.innerHTML = '';
            blocks.slice(0, 3).forEach(block => {
                const row = document.createElement('tr');
                row.className = 'hover:bg-surface-container-low/50 transition-colors';
                row.innerHTML = `
                    <td class="px-6 py-4 font-mono text-xs text-primary font-bold">#${block.index}</td>
                    <td class="px-6 py-4 text-sm font-medium">${block.event || 'Model Update'}</td>
                    <td class="px-6 py-4 font-mono text-[11px] text-on-surface-variant">${block.hash?.substring(0,10) || '0x'}</td>
                    <td class="px-6 py-4"><span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-700 uppercase">Verified</span></td>
                `;
                tbody.appendChild(row);
            });
        } catch (e) {
            console.warn('Audit trail not loaded:', e);
        }
    }
    
    // ----- Sidebar Navigation (Smooth Scroll) -----
    function initNavigation() {
        const navItems = document.querySelectorAll('[data-section]');
        navItems.forEach(item => {
            item.addEventListener('click', function(e) {
                e.preventDefault();
                const sectionKey = this.getAttribute('data-section');
                const targetElement = sections[sectionKey];
                if (targetElement) {
                    targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                } else if (sectionKey === 'risk-triage') {
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }
                
                // Optional: Update active state styling
                navItems.forEach(nav => nav.classList.remove('bg-white', 'dark:bg-slate-900', 'text-[#00346c]', 'dark:text-blue-300', 'font-bold'));
                this.classList.add('bg-white', 'dark:bg-slate-900', 'text-[#00346c]', 'dark:text-blue-300', 'font-bold');
            });
        });
    }
    
    // ----- Initialize -----
    function init() {
        if (runButton) runButton.addEventListener('click', runPrediction);
        if (sampleBtn) sampleBtn.addEventListener('click', prefillSample);
        loadAuditTrail();
        initNavigation();
    }
    
    // Start when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
})();