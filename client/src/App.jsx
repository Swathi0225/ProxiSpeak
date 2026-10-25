import React, { useCallback, useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

const SERVER = "http://localhost:3001";
const W = 800, H = 500, RADIUS = 100;
const colors = ["#2563eb", "#db2777", "#059669", "#d97706", "#7c3aed", "#0891b2"];

function drawDesk(ctx, x, y, w = 54, h = 30) {
  ctx.fillStyle = "#c9a783";
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = "#9b7653";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x, y, w, h);
  ctx.fillStyle = "#334155";
  ctx.fillRect(x + w * 0.28, y + 5, w * 0.44, h * 0.42);
  ctx.fillStyle = "#94a3b8";
  ctx.fillRect(x + w * 0.31, y + 7, w * 0.38, h * 0.28);
  ctx.fillStyle = "#475569";
  ctx.fillRect(x + w * 0.46, y + h * 0.42, w * 0.08, 5);
  ctx.fillStyle = "#64748b";
  ctx.fillRect(x + w * 0.34, y + h * 0.42 + 4, w * 0.32, 3);
}
function drawChair(ctx, x, y) {
  ctx.fillStyle = "#64748b";
  ctx.beginPath(); ctx.roundRect(x, y, 18, 15, 4); ctx.fill();
  ctx.fillStyle = "#94a3b8";
  ctx.fillRect(x + 7, y + 14, 4, 7);
  ctx.fillRect(x + 3, y + 20, 12, 3);
}
function drawPlant(ctx, x, y) {
  ctx.fillStyle = "#b7794b"; ctx.fillRect(x - 7, y + 5, 14, 13);
  ctx.fillStyle = "#15803d";
  [[-7,-4],[0,-10],[7,-3],[-2,1],[5,3]].forEach(([dx,dy]) => {
    ctx.beginPath(); ctx.ellipse(x + dx, y + dy, 5, 8, dx / 10, 0, Math.PI * 2); ctx.fill();
  });
}
function drawRoomLabel(ctx, label, x, y, width) {
  ctx.fillStyle = "#e0f2fe";
  ctx.beginPath(); ctx.roundRect(x, y, width, 24, 7); ctx.fill();
  ctx.fillStyle = "#1e40af";
  ctx.font = "700 11px system-ui"; ctx.textAlign = "left";
  ctx.fillText(label, x + 9, y + 16);
}
function drawOffice(ctx) {
  ctx.fillStyle = "#f1f5f9"; ctx.fillRect(0, 0, W, H);
  // Outer wall and subtle floor grid
  ctx.fillStyle = "#fff"; ctx.fillRect(12, 12, 776, 476);
  ctx.strokeStyle = "#dbe4ef"; ctx.lineWidth = 3; ctx.strokeRect(12, 12, 776, 476);
  ctx.strokeStyle = "#edf2f7"; ctx.lineWidth = 1;
  for (let x = 32; x < W; x += 25) { ctx.beginPath(); ctx.moveTo(x, 25); ctx.lineTo(x, 475); ctx.stroke(); }
  for (let y = 25; y < H; y += 25) { ctx.beginPath(); ctx.moveTo(25, y); ctx.lineTo(775, y); ctx.stroke(); }

  // Rooms with soft, different floor tints
  const rooms = [
    {x:30,y:30,w:230,h:130,fill:"#fef3c7",label:"MEETING ROOM"},
    {x:285,y:30,w:230,h:130,fill:"#dbeafe",label:"TEAM AREA"},
    {x:540,y:30,w:230,h:130,fill:"#ede9fe",label:"FOCUS ROOM"},
    {x:30,y:340,w:230,h:125,fill:"#dcfce7",label:"LOUNGE"},
    {x:285,y:340,w:230,h:125,fill:"#e0f2fe",label:"DESKS"},
    {x:540,y:340,w:230,h:125,fill:"#ffedd5",label:"CAFÉ"}
  ];
  rooms.forEach(r => {
    ctx.fillStyle = r.fill; ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.strokeStyle = "#cbd5e1"; ctx.lineWidth = 2; ctx.strokeRect(r.x, r.y, r.w, r.h);
    drawRoomLabel(ctx, r.label, r.x + 8, r.y + 7, Math.min(135, r.w - 16));
  });

  // Meeting room: table and chairs
  ctx.fillStyle = "#b68a63"; ctx.beginPath(); ctx.roundRect(86, 83, 116, 43, 8); ctx.fill();
  ctx.strokeStyle = "#8b6545"; ctx.strokeRect(86, 83, 116, 43);
  ctx.fillStyle = "#f8fafc"; ctx.fillRect(100, 94, 88, 20);
  [[72,89],[72,111],[198,89],[198,111],[130,70],[158,70],[130,130],[158,130]].forEach(([x,y])=>drawChair(ctx,x,y));

  // Team area desks
  drawDesk(ctx, 310, 78, 58, 34); drawChair(ctx, 330, 114);
  drawDesk(ctx, 395, 78, 58, 34); drawChair(ctx, 415, 114);
  drawPlant(ctx, 487, 133);

  // Focus room: quiet chair and small table
  ctx.fillStyle = "#cbd5e1"; ctx.beginPath(); ctx.roundRect(605, 82, 62, 44, 8); ctx.fill();
  ctx.fillStyle = "#94a3b8"; ctx.beginPath(); ctx.roundRect(612, 88, 48, 30, 6); ctx.fill();
  ctx.fillStyle = "#b68a63"; ctx.beginPath(); ctx.arc(710, 105, 17, 0, Math.PI*2); ctx.fill();
  drawPlant(ctx, 746, 63);

  // Lounge sofas and coffee table
  ctx.fillStyle = "#6d9e8a"; ctx.beginPath(); ctx.roundRect(58, 390, 78, 35, 8); ctx.fill();
  ctx.fillStyle = "#a7cbbd"; ctx.fillRect(65, 395, 64, 24);
  ctx.fillStyle = "#6d9e8a"; ctx.beginPath(); ctx.roundRect(155, 390, 65, 35, 8); ctx.fill();
  ctx.fillStyle = "#b68a63"; ctx.beginPath(); ctx.roundRect(111, 432, 48, 18, 5); ctx.fill();
  drawPlant(ctx, 238, 442);

  // Desk area: four workstations
  drawDesk(ctx, 307, 385, 58, 32); drawChair(ctx, 327, 421);
  drawDesk(ctx, 390, 385, 58, 32); drawChair(ctx, 410, 421);
  drawDesk(ctx, 307, 431, 58, 25); drawDesk(ctx, 390, 431, 58, 25);

  // Cafe counter, tables and chairs
  ctx.fillStyle = "#c08457"; ctx.beginPath(); ctx.roundRect(560, 383, 72, 28, 6); ctx.fill();
  ctx.fillStyle = "#fff7ed"; ctx.font = "700 9px system-ui"; ctx.textAlign = "center"; ctx.fillText("COFFEE", 596, 400);
  [[670,405],[727,405],[670,444],[727,444]].forEach(([x,y]) => {
    ctx.fillStyle = "#d6a574"; ctx.beginPath(); ctx.arc(x,y,13,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle = "#a9784c"; ctx.stroke();
    drawChair(ctx,x-8,y+12);
  });
  drawPlant(ctx, 558, 442);
}
export default function App() {
  const canvasRef = useRef(null);
  const socketRef = useRef(null);
  const peersRef = useRef(new Map());
  const localStreamRef = useRef(null);
  const micOnRef = useRef(false);
  const usersRef = useRef([]);
  const nearbyRef = useRef([]);
  const positionRef = useRef({ x: 400, y: 250 });
  const [name, setName] = useState("");
  const [joined, setJoined] = useState(false);
  const [users, setUsers] = useState([]);
  const [nearby, setNearby] = useState([]);
  const [micOn, setMicOn] = useState(false);
  micOnRef.current = micOn;
  const [status, setStatus] = useState("Connecting…");
  const [notice, setNotice] = useState("Enter a name and join the office.");

  const createPeer = useCallback((peerId, initiator) => {
    if (peersRef.current.has(peerId)) return peersRef.current.get(peerId).pc;
    const pc = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });
    const entry = { pc, audio: null };
    peersRef.current.set(peerId, entry);
    if (localStreamRef.current) localStreamRef.current.getTracks().forEach(track => pc.addTrack(track, localStreamRef.current));
    pc.onicecandidate = e => { if (e.candidate) socketRef.current?.emit("webrtc:ice", { to: peerId, data: e.candidate }); };
    pc.ontrack = e => {
      if (!entry.audio) {
        const audio = new Audio(); audio.autoplay = true; audio.srcObject = e.streams[0]; audio.volume = 0.8;
        entry.audio = audio; audio.play().catch(() => setNotice("Click the page once to allow remote audio playback."));
      }
    };
    pc.onconnectionstatechange = () => {
      if (["failed", "closed", "disconnected"].includes(pc.connectionState)) {
        entry.audio?.pause(); peersRef.current.delete(peerId);
      }
    };
    if (initiator) {
      pc.createOffer().then(offer => pc.setLocalDescription(offer))
        .then(() => socketRef.current?.emit("webrtc:offer", { to: peerId, data: pc.localDescription }))
        .catch(err => console.error("Offer error:", err));
    }
    return pc;
  }, []);

  useEffect(() => {
    const socket = io(SERVER); socketRef.current = socket;
    socket.on("connect", () => setStatus("Connected to signaling server"));
    socket.on("disconnect", () => setStatus("Disconnected"));
    socket.on("world:update", list => {
      usersRef.current = list; setUsers(list);
      const me = list.find(u => u.id === socket.id);
      if (me) positionRef.current = { x: me.x, y: me.y };
    });
    socket.on("proximity:update", data => {
      nearbyRef.current = data.nearby || []; setNearby(data.nearby || []);
      const nearbyIds = new Set((data.nearby || []).map(u => u.id));
      for (const [id, entry] of peersRef.current.entries()) {
        if (!nearbyIds.has(id)) { entry.pc.close(); entry.audio?.pause(); peersRef.current.delete(id); }
      }
      for (const peer of data.nearby || []) {
        if (micOnRef.current && socket.id < peer.id && !peersRef.current.has(peer.id)) createPeer(peer.id, true);
      }
    });
    socket.on("webrtc:offer", async ({ from, data }) => {
      try {
        const pc = createPeer(from, false);
        await pc.setRemoteDescription(new RTCSessionDescription(data));
        const answer = await pc.createAnswer(); await pc.setLocalDescription(answer);
        socket.emit("webrtc:answer", { to: from, data: pc.localDescription });
      } catch (e) { console.error("Offer handling error:", e); }
    });
    socket.on("webrtc:answer", async ({ from, data }) => {
      const entry = peersRef.current.get(from);
      if (entry && entry.pc.signalingState !== "stable") {
        try { await entry.pc.setRemoteDescription(new RTCSessionDescription(data)); } catch (e) { console.error(e); }
      }
    });
    socket.on("webrtc:ice", async ({ from, data }) => {
      const entry = peersRef.current.get(from);
      if (entry) { try { await entry.pc.addIceCandidate(new RTCIceCandidate(data)); } catch (e) { console.error(e); } }
    });
    return () => { peersRef.current.forEach(entry => entry.pc.close()); socket.disconnect(); };
  }, [createPeer]);

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d"); let frame;
    const draw = () => {
      drawOffice(ctx);
      const me = usersRef.current.find(u => u.id === socketRef.current?.id);
      if (me) {
        ctx.beginPath(); ctx.arc(me.x, me.y, RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(37,99,235,0.10)"; ctx.fill();
        ctx.strokeStyle = "rgba(37,99,235,0.55)"; ctx.lineWidth = 2;
        ctx.setLineDash([6, 5]); ctx.stroke(); ctx.setLineDash([]);
      }
      usersRef.current.forEach((u, i) => {
        const isMe = u.id === socketRef.current?.id;
        const isNear = nearbyRef.current.some(n => n.id === u.id);
        ctx.save();
        ctx.shadowColor = "rgba(15,23,42,.22)"; ctx.shadowBlur = 8; ctx.shadowOffsetY = 2;
        ctx.beginPath(); ctx.arc(u.x, u.y, isMe ? 14 : 12, 0, Math.PI * 2);
        ctx.fillStyle = isMe ? "#2563eb" : isNear ? "#16a34a" : colors[i % colors.length]; ctx.fill();
        ctx.restore();
        ctx.strokeStyle = "#fff"; ctx.lineWidth = 3; ctx.stroke();
        ctx.fillStyle = "#0f172a"; ctx.font = "700 12px system-ui"; ctx.textAlign = "center";
        ctx.fillText(isMe ? `${u.name} (you)` : u.name, u.x, u.y - 21);
      });
      frame = requestAnimationFrame(draw);
    };
    draw(); return () => cancelAnimationFrame(frame);
  }, []);

  const join = () => {
    if (!name.trim()) { setNotice("Please enter your display name."); return; }
    socketRef.current?.emit("user:join", { name: name.trim() });
    setJoined(true); setNotice("You're in! Use W/A/S/D or arrow keys to explore the office.");
  };

  useEffect(() => {
    if (!joined) return;
    const move = e => {
      const key = e.key.toLowerCase();
      const dirs = { arrowup: [0,-8], w: [0,-8], arrowdown: [0,8], s: [0,8], arrowleft: [-8,0], a: [-8,0], arrowright: [8,0], d: [8,0] };
      if (!dirs[key]) return;
      e.preventDefault();
      const next = { x: Math.max(28, Math.min(772, positionRef.current.x + dirs[key][0])), y: Math.max(28, Math.min(472, positionRef.current.y + dirs[key][1])) };
      positionRef.current = next; socketRef.current?.emit("user:move", next);
    };
    window.addEventListener("keydown", move); return () => window.removeEventListener("keydown", move);
  }, [joined]);

  const enableMic = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream; setMicOn(true);
      for (const entry of peersRef.current.values()) stream.getTracks().forEach(track => entry.pc.addTrack(track, stream));
      setNotice("Microphone enabled. Move within 100 px of another mic-enabled browser.");
    } catch { setNotice("Microphone permission failed. Allow microphone access in your browser settings."); }
  };
  const disableMic = () => {
    localStreamRef.current?.getTracks().forEach(t => t.stop()); localStreamRef.current = null;
    peersRef.current.forEach(entry => { entry.pc.close(); entry.audio?.pause(); }); peersRef.current.clear();
    setMicOn(false); setNotice("Microphone disabled.");
  };

  return <main className="shell">
    <header className="topbar">
      <div className="brand-mark">P</div>
      <div className="brand-copy"><div className="eyebrow">PROXIMITY-BASED COLLABORATION</div><h1>ProxiSpeak <span>●</span></h1><p>Walk closer. Join the conversation naturally.</p></div>
      <div className="server-pill"><i />{status}</div>
    </header>
    <section className="layout">
      <div className="world-card">
        <div className="card-heading"><div><span className="section-kicker">YOUR WORKSPACE</span><h2>Virtual office</h2><p>Explore the office with W A S D or arrow keys</p></div><div className="legend"><span className="blue-dot"/> You <span className="green-dot"/> Nearby</div></div>
        <div className="canvas-wrap"><canvas ref={canvasRef} width={W} height={H} aria-label="Virtual office map" /></div>
        <div className="controls">
          {!joined ? <><input value={name} onChange={e => setName(e.target.value)} placeholder="Enter your name" maxLength={24} onKeyDown={e => e.key === "Enter" && join()} /><button onClick={join}>Join office <span>→</span></button></> :
          <><span className="joined-label"><i className="live-dot" /> Joined as <b>{name}</b></span>{!micOn ? <button onClick={enableMic}>🎙 Enable microphone</button> : <button className="secondary" onClick={disableMic}>🔇 Disable microphone</button>}</>}
        </div>
        <div className="notice"><span>ⓘ</span>{notice}</div>
      </div>
      <aside>
        <div className="side-card welcome-card"><div className="side-icon">⌘</div><div><h3>Office overview</h3><p>Move around to discover who's nearby.</p></div></div>
        <div className="side-card"><h3>People in office <span>{users.length}</span></h3>
          {users.length === 0 ? <p className="empty">No one here yet. Join to appear on the map.</p> : users.map((u,i) => <div className="person" key={u.id}><i style={{background:u.id===socketRef.current?.id?"#2563eb":colors[i%colors.length]}}/><div><b>{u.name}{u.id===socketRef.current?.id?" (you)":""}</b><small>X: {Math.round(u.x)} · Y: {Math.round(u.y)}</small></div><span className="online-tag">ONLINE</span></div>)}
        </div>
        <div className="side-card"><h3>Within earshot <span>{nearby.length}</span></h3><p className="subtext">People within {RADIUS} pixels</p>
          {nearby.length===0?<p className="empty">Move closer to another avatar to start a conversation.</p>:nearby.map(u=><div className="near-person" key={u.id}><div><b>{u.name}</b><small>{u.distance}px away</small></div><span className="near-badge">NEARBY</span></div>)}
        </div>
        <div className="side-card technical"><h3>Live system status <span className="live-tag">LIVE</span></h3><p><span className="status-dot"/> Socket.IO signaling</p><p><span className="status-dot"/> 100 px proximity radius</p><p><span className={micOn?"status-dot":"status-off"}/>{micOn?"Microphone enabled":"Microphone not enabled"}</p><p><span className="status-off"/> MongoDB optional</p></div>
      </aside>
    </section>
    <footer>PROXISPEAK · React Canvas · Node.js · Socket.IO · WebRTC · MongoDB GeoJSON ready</footer>
  </main>;
}
