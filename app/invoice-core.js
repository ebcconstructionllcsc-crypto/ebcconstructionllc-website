(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.EBCInvoiceCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function roundMoney(value) {
    return Math.round((Number(value) || 0) * 100) / 100;
  }

  function amountForPhase(projectTotal, percent) {
    return roundMoney(Math.max(0, Number(projectTotal) || 0) * Math.max(0, Number(percent) || 0) / 100);
  }

  function balance(amountDue, amountPaid) {
    return roundMoney(Math.max(0, (Number(amountDue) || 0) - (Number(amountPaid) || 0)));
  }

  function validPaymentUrl(value) {
    try {
      const url = new URL(String(value || '').trim());
      return url.protocol === 'https:' ? url.href : '';
    } catch {
      return '';
    }
  }

  function containsSensitiveFinancialNumber(value) {
    return /(?:\d[\s-]*){9,17}/.test(String(value || ''));
  }

  function phasePercent(phase, schedule = [30, 45, 25], customPercent = 0) {
    const indexes = { initial: 0, progress: 1, final: 2 };
    if (phase === 'custom') return Math.max(0, Number(customPercent) || 0);
    return Math.max(0, Number(schedule[indexes[phase]]) || 0);
  }

  function acceptedMethodKeys(values) {
    return ['ach', 'zelle', 'check', 'cash', 'online'].filter(key => Boolean(values[key]));
  }

  return {
    acceptedMethodKeys,
    amountForPhase,
    balance,
    containsSensitiveFinancialNumber,
    phasePercent,
    roundMoney,
    validPaymentUrl
  };
});
