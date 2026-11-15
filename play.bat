@echo off
rem MOONKEEPER - double-click to play. Needs Node.js (https://nodejs.org). Close this window to stop.
cd /d "%~dp0"
start "" http://localhost:8130
node tools\serve.mjs 8130
