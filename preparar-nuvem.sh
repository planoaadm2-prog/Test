#!/usr/bin/env bash
set -euo pipefail
# O pacote npm xlsx 0.18.5 é antigo. O servidor publicado só deve iniciar
# após instalar a versão corrigida diretamente da distribuição oficial.
npm ci --no-fund
npm install --no-save --package-lock=false --no-fund https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz
node --input-type=module -e "import XLSX from 'xlsx'; if(XLSX.version !== '0.20.3') throw Error('Versão inesperada do leitor Excel');"
npm run build
npm test
