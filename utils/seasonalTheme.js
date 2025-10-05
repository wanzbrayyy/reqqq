function getSeasonalClass() {
  const today = new Date();
  const month = today.getMonth() + 1;
  const date = today.getDate();

  // Valentine: 14 Feb
  if (month === 2 && date === 14) return 'valentine-theme';
  // Lebaran: 10-15 April (asumsi)
  if (month === 4 && date >= 10 && date <= 15) return 'lebaran-theme';
  // Natal: 25 Des
  if (month === 12 && date === 25) return 'natal-theme';
  // Default: tidak ada kelas khusus
  return '';
}

module.exports = { getSeasonalClass };