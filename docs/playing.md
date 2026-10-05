# Playing: setup, online, browsers, limitations

## Run it on your computer

You need **Node.js 22 or newer** ([download the LTS version](https://nodejs.org/)).

```bash
npm install
npm run dev
```

Open the address it prints (usually **http://localhost:5173**) in **Chrome or Edge**. The microphone works on `localhost` without HTTPS.

To build the static site: `npm run build` (output goes to `dist/`).

## Play with a friend

Both players open the same game URL in **Chrome or Edge** on their own computers.

1. Both choose a **voice language** in the lobby (each player chooses independently).
2. **One** player clicks **Host game**. A big 5-character **room code** appears; click **Copy** and send it to your friend.
3. The **other** player types the code under **Join game** and clicks **Join**.
4. Both pick **2 creatures** (your first pick goes out first) and click **Ready**.
5. When the browser asks for the **microphone**, click **Allow**.
6. Talk to your creature!

After a match, **Rematch** needs both players to click it; **Quit** goes back to the lobby. If someone closes the tab or loses connection, the other sees "Opponent disconnected".

**Practice vs Bot** lets you play alone. The bot issues random moves every 1–3 seconds, sometimes arms a dodge against heavy attacks and sometimes goes on alert when it is low on HP.

## Browser requirements

- **Google Chrome or Microsoft Edge** (desktop recommended; Chrome on Android also works). Firefox and Safari don't support the speech recognition this game uses; Brave and Opera expose it but it doesn't work. Other browsers show a warning; menus and the debug text box still work.
- **Microphone permission:** click **Allow** when asked. If you blocked it, click the lock or camera icon in the address bar, allow the microphone, and reload.
- **Internet connection:** needed for speech recognition (Chrome sends audio to Google's speech service) and for online matchmaking. A wired or stable Wi-Fi connection helps.
- **HTTPS** (or `localhost`) is required for the microphone. GitHub Pages and Netlify both use HTTPS.
- A computer that can run WebGL. Any machine from the last ~8 years should be fine.

## Known limitations

- **Voice latency:** browsers deliver a final transcript about 0.5–1.5 s after you finish speaking. Short, clear commands and a brief pause work best. Arm the dodge early: the 2 s window gives you time once you see "Charging: …!" in the opponent panel.
- **Speech accuracy** drops in noisy rooms or with speakers near the mic. Headphones help, and they stop game sounds from reaching the mic.
- **Some networks block peer-to-peer.** The game uses public STUN servers and no TURN relay, so some strict corporate, school or mobile networks can't connect. Try another network (for example a phone hotspot) if joining hangs.
- **The public PeerJS broker** (`0.peerjs.com`) is only used to introduce the two browsers. If it's down, online play can't start (Practice still works).
- **No reconnection:** if either player disconnects, the match ends.
- **The host's browser runs the match.** It keeps running if the host switches tabs, but browsers may slow background tabs, so keep the game visible while playing.
- **Two players on one computer** can test the connection in two tabs, but the microphone can only be used by one tab at a time.
- **Speech recognition privacy:** in Chrome and Edge, audio is processed by Google or Microsoft speech services, not locally. The game itself never sends audio to the other player; only parsed commands travel over the connection.

