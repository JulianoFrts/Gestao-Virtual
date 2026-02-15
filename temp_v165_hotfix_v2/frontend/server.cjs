const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 80;

// Pasta onde os arquivos buildados estão
const distDir = path.join(__dirname, 'dist');

app.use(express.static(distDir));

// Suporte para SPA (Single Page Application)
app.get('*', (req, res) => {
  res.sendFile(path.join(distDir, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`✅ Frontend Gestão Virtual ONLINE (Modo Zero Processamento)`);
  console.log(`🚀 Porta: ${PORT}`);
});
