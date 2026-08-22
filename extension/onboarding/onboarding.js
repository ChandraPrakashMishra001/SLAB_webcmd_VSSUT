let currentStep = 1;
const totalSteps = 5;

const btnPrev = document.getElementById('btnPrev');
const btnNext = document.getElementById('btnNext');
const btnFinish = document.getElementById('btnFinish');

function updateUI() {
  document.querySelectorAll('.step-card').forEach(card => {
    card.classList.toggle('active', parseInt(card.dataset.step, 10) === currentStep);
  });

  document.querySelectorAll('.dot').forEach(dot => {
    dot.classList.toggle('active', parseInt(dot.dataset.dot, 10) === currentStep);
  });

  btnPrev.style.visibility = currentStep === 1 ? 'hidden' : 'visible';

  if (currentStep === totalSteps) {
    btnNext.style.display = 'none';
    btnFinish.style.display = 'inline-flex';
  } else {
    btnNext.style.display = 'inline-flex';
    btnFinish.style.display = 'none';
  }
}

btnNext.onclick = () => {
  if (currentStep < totalSteps) {
    currentStep++;
    updateUI();
  }
};

btnPrev.onclick = () => {
  if (currentStep > 1) {
    currentStep--;
    updateUI();
  }
};

btnFinish.onclick = () => {
  window.close();
};

document.querySelectorAll('.dot').forEach(dot => {
  dot.onclick = () => {
    currentStep = parseInt(dot.dataset.dot, 10);
    updateUI();
  };
});
