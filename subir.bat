@echo off
chcp 65001 >nul
echo.
echo ==========================================
echo   Subindo as mudancas do site pro GitHub
echo ==========================================
echo.

git add -A
git commit -m "Atualizacao %date% %time%"
git push origin main

echo.
echo ==========================================
echo   Pronto! A Vercel ja vai publicar sozinha.
echo   Espera 1-2 minutinhos e testa o site.
echo ==========================================
echo.
pause
