(() => {
  const button = document.querySelector('#create-proposal-btn');
  const editor = document.querySelector('#quote-app .editor');
  const items = document.querySelector('#items');

  if (!button || !editor || !items) return;

  const TRANSFER_KEY = 'ebc-proposal-from-quote';

  function readFields() {
    return Object.fromEntries(
      [...editor.querySelectorAll('input[id], select[id], textarea[id]')]
        .filter(element => element.id !== 'saved-quotes')
        .map(element => [
          element.id,
          element.type === 'checkbox' ? element.checked : element.value
        ])
    );
  }

  function readItems() {
    return [...items.querySelectorAll('.item-row')].map(row => ({
      key: row.dataset.takeoffKey || '',
      description: row.querySelector('.desc')?.value.trim() || '',
      qty: Number(row.querySelector('.qty')?.value) || 0,
      unit: row.querySelector('.unit')?.value || 'lump sum',
      rate: Number(row.querySelector('.rate')?.value) || 0
    }));
  }

  function readRender() {
    const section = document.querySelector('#render-editor-section');
    const image = document.querySelector('#render-editor-thumb');
    if (!section || section.hidden || !image?.getAttribute('src')) return null;
    return {
      image: image.src,
      source: 'quote-builder'
    };
  }

  function createTransfer() {
    return {
      transferVersion: 1,
      transferredAt: new Date().toISOString(),
      fields: readFields(),
      items: readItems(),
      quoteRender: readRender()
    };
  }

  button.addEventListener('click', () => {
    try {
      const transfer = createTransfer();
      sessionStorage.setItem(TRANSFER_KEY, JSON.stringify(transfer));
      window.location.href = 'proposal.html';
    } catch (error) {
      console.error('Professional proposal transfer:', error);
      window.alert('No se pudo preparar la propuesta profesional. Guarda la cotización e inténtalo nuevamente.');
    }
  });

  window.EbcProposalTransfer = {
    key: TRANSFER_KEY,
    createTransfer
  };
})();