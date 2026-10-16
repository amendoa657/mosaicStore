#!/bin/sh
# Abre o Mosaic na janela (sem o --janela, o app.py sobe só o Flask).
exec python /usr/share/mosaic-store/app.py --janela "$@"
