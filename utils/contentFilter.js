const bannedPhrases = [
  'bodoh',
  'goblok',
  'tolol',
  'idiot',
  'stupid',
  'bloody',
  'goblokk',
  'goblokk',
  'dasar',
  'sampah',
  'brengsek',
  'jangan ganggu',
  'jgn ganggu',
  'jangan chat',
  'jgn chat',
  'stop',
  'berhenti',
  'jangan kirim',
  'jgn kirim'
];

function isProfane(text) {
  const lower = text.toLowerCase().trim();
  return bannedPhrases.some(phrase => {
    const regex = new RegExp(`\\b${phrase.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'i');
    return regex.test(lower);
  });
}

module.exports = { isProfane };