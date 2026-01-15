function basisIsPerBL(rec) {
    const b = up(rec?.rate_basis || rec?.basis || '');
    return b.includes('PER') && (b.includes('BL') || b.includes('B/L') || b.includes('BILL OF LADING'));
}

function productFromIso(iso) {
    let s = (iso || '').toUpperCase().replace(/[\s-]+/g, '');
    const is20 = s.includes('20') && !s.includes('40');
    const is40 = s.includes('40');
    const hasHC = s.includes('HC');
    const isReefer = s.includes('RF') || s.includes('RFR') || s.includes('REEFER');

    if (isReefer) {
        if (is20) return "20' Reefer";
        if (is40 && hasHC) return "40' HC Reefer";
        if (is40) return "40' Reefer";
        return null;
    }

    if (is20) return "20' Dry";
    if (is40 && hasHC) return "40' HC Dry";
    if (is40) return "40' Dry";
    return null;
}

function productToIso(p) {
    if (p === '20\' Dry') return '20DV';
    if (p === '20\' Flat') return '20FL';
    if (p === '20\' Open Top') return '20OT';
    if (p === '20\' Reefer') return '20RF';

    if (p === '40\' Dry') return '40DV';
    if (p === '40\' Flat') return '40FL';
    if (p === '40\' Open Top') return '40OT';
    if (p === '40\' Reefer') return '40RF';

    if (p === '40\' HC Dry') return '40HC';
    if (p === '40\' HC Flat') return '40HCFL';
    if (p === '40\' HC Open Top') return '40HCOT';
    if (p === '40\' HC Reefer') return '40HCRF';


    if (p === '45\' HC Dry') return '45HC';
    if (p === '45\' HC Reefer') return '45HCRF';

    return '';
}

function up(s) {
    return String(s ?? '').toUpperCase();
}

module.exports = {
    basisIsPerBL,
    productFromIso,
    productToIso
};