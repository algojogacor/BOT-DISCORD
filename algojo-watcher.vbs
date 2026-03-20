Set WshShell = CreateObject("WScript.Shell")
WshShell.Run "wsl -e bash -c 'cd /mnt/d/BOT\ DISCORD && node algojo-watcher.js >> /mnt/d/BOT\ DISCORD/watcher.log 2>&1'", 0, False