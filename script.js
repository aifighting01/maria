(function () {
  "use strict";
  document.documentElement.classList.remove("no-js");

  /* ---------- 언어 (KO / EN) ----------
     기본 한국어. ?lang=en|ko > localStorage("maria-lang") > ko. <html lang> 과 html.lang-en 클래스로 전환.
     본문은 .i18n-ko / .i18n-en 쌍으로 들어 있고 CSS 가 하나만 보여 줌. 속성은 data-en-<attr> 로 교체 (원래 값은 data-ko-<attr>). */
  var HTML = document.documentElement;
  var META = {
    ko: { title: "MARIA — 마리아 | ai_fighting", desc: "Devil Hunter MARIA — ai_fighting 의 AI 영상 포트폴리오" },
    en: { title: "MARIA | ai_fighting", desc: "Devil Hunter MARIA — an AI film portfolio by ai_fighting" }
  };
  function isEn() { return HTML.classList.contains("lang-en"); }
  function T(ko, en) { return isEn() ? en : ko; }
  function applyAttrs(root) {
    var en = isEn();
    Array.prototype.forEach.call((root || document).querySelectorAll("*"), function (el) {
      for (var i = 0; i < el.attributes.length; i++) {
        var n = el.attributes[i].name;
        if (n.indexOf("data-en-") !== 0) continue;
        var a = n.slice(8), ko = "data-ko-" + a;
        if (!el.hasAttribute(ko)) el.setAttribute(ko, el.getAttribute(a) || "");
        el.setAttribute(a, en ? el.getAttribute(n) : el.getAttribute(ko));
      }
    });
  }
  function setLang(l, save) {
    l = l === "en" ? "en" : "ko";
    HTML.classList.toggle("lang-en", l === "en");
    HTML.setAttribute("lang", l);
    document.title = META[l].title;
    Array.prototype.forEach.call(document.querySelectorAll('meta[name="description"],meta[property="og:description"]'), function (m) { m.setAttribute("content", META[l].desc); });
    var og = document.querySelector('meta[property="og:title"]'); if (og) og.setAttribute("content", META[l].title);
    applyAttrs(document);
    Array.prototype.forEach.call(document.querySelectorAll(".langtg [data-l]"), function (b) { b.setAttribute("aria-pressed", b.getAttribute("data-l") === l ? "true" : "false"); });
    if (typeof paintBgmBtn === "function") paintBgmBtn();
    try { document.dispatchEvent(new CustomEvent("maria:lang", { detail: l })); } catch (e) {}
    if (save) { try { localStorage.setItem("maria-lang", l); } catch (e) {} }
  }
  window.__mariaLang = setLang;
  (function () {
    var q = (location.search.match(/[?&]lang=(en|ko)\b/) || [])[1], st = null;
    try { st = localStorage.getItem("maria-lang"); } catch (e) {}
    if (q) { try { localStorage.setItem("maria-lang", q); } catch (e) {} }
    setLang(q || st || "ko", false);
    Array.prototype.forEach.call(document.querySelectorAll(".langtg [data-l]"), function (b) {
      b.addEventListener("click", function () { setLang(b.getAttribute("data-l"), true); });
    });
  })();


  /* ---------- 배경음악 ----------
     홈·작품 페이지에서 루프. 자동재생이 막히면 첫 탭·클릭·스크롤에서 시작.
     아무 <video> 가 재생되면 멈춤. 영상이 끝나거나 플레이어를 닫고 홈으로 돌아오면
     (음소거가 아닐 때) 다시 재생. 플레이어가 열린 채 일시정지된 영상은 BGM 을 계속 멈춤.
     음소거 상태는 localStorage("maria-bgm-muted"). */
  var BGM_SRC = "https://aifighting01.github.io/maria/audio/bgm.mp3";
  var BGM_KEY = "maria-bgm-muted";
  var bgm = document.getElementById("maria-bgm");
  var bgmBtn = document.querySelector(".bgmtg");
  var bgmMuted = false;
  try { bgmMuted = localStorage.getItem(BGM_KEY) === "1"; } catch (e) {}
  if (bgm) {
    if (bgm.getAttribute("src") !== BGM_SRC) bgm.setAttribute("src", BGM_SRC);
    bgm.loop = true;
    try { bgm.volume = 0.55; } catch (e) {}
    bgm.setAttribute("playsinline", "");
    bgm.setAttribute("webkit-playsinline", "");
    try { if (bgm.controlsList && bgm.controlsList.add) bgm.controlsList.add("nodownload"); } catch (e) {}
  }
  function bgmHeldByVideo() {
    if (document.documentElement.classList.contains("vm-open") && VM && !VM.hidden) {
      var vid = VM.querySelector("video");
      if (vid && vid.ended) return false;
      return true;
    }
    var vs = document.querySelectorAll("video");
    for (var i = 0; i < vs.length; i++) {
      if (!vs[i].paused && !vs[i].ended) return true;
    }
    return false;
  }
  function pauseBgm() {
    if (bgm && !bgm.paused) try { bgm.pause(); } catch (e) {}
  }
  function tryPlayBgm() {
    if (!bgm || bgmMuted || bgmHeldByVideo()) { pauseBgm(); paintBgmBtn(); return; }
    var p;
    try { p = bgm.play(); } catch (e) { paintBgmBtn(); return; }
    if (p && p.then) {
      p.then(function () { paintBgmBtn(); }).catch(function () { paintBgmBtn(); });
    } else paintBgmBtn();
  }
  function paintBgmBtn() {
    if (!bgmBtn) { if (typeof paintHint === "function" && bgmHint) paintHint(); return; }
    var waiting = !bgmMuted && (!bgm || bgm.paused) && !bgmHeldByVideo();
    bgmBtn.classList.toggle("is-muted", !!bgmMuted);
    bgmBtn.classList.toggle("is-waiting", !!waiting);
    bgmBtn.setAttribute("aria-pressed", bgmMuted ? "true" : "false");
    bgmBtn.setAttribute("data-ko-aria-label", bgmMuted ? "배경음악 켜기" : "배경음악 끄기");
    bgmBtn.setAttribute("data-en-aria-label", bgmMuted ? "Unmute background music" : "Mute background music");
    bgmBtn.setAttribute("aria-label", T(bgmBtn.getAttribute("data-ko-aria-label"), bgmBtn.getAttribute("data-en-aria-label")));
    if (typeof paintHint === "function" && bgmHint) paintHint();
  }
  function isVideoGesture(e) {
    var t = e.target;
    if (!t || !t.closest) return false;
    return !!(t.closest(".vcard") || t.closest(".vmodal") || (t.tagName && t.tagName.toLowerCase() === "video"));
  }
  function onFirstGesture(e) {
    if (bgmMuted) return;
    if (isVideoGesture(e)) return;
    var t = e.target;
    if (t && t.closest && (t.closest(".bgmtg") || t.closest(".bgm-hint"))) return;
    tryPlayBgm();
  }
  /* 브라우저는 스크롤로는 소리 재생을 허락하지 않음: 탭/클릭/키 입력에서만 시작 가능 */
  ["pointerup", "touchend", "click", "keydown", "mousedown"].forEach(function (ev) {
    window.addEventListener(ev, onFirstGesture, { passive: true, capture: true });
  });
  var bgmHint = document.createElement("button");
  bgmHint.type = "button";
  bgmHint.className = "bgm-hint";
  bgmHint.setAttribute("data-ko", "♪ 탭하면 음악이 재생돼요");
  bgmHint.setAttribute("data-en", "♪ Tap to play music");
  function paintHint() {
    var show = !bgmMuted && bgm && bgm.paused && !bgmHeldByVideo();
    bgmHint.textContent = T(bgmHint.getAttribute("data-ko"), bgmHint.getAttribute("data-en"));
    bgmHint.classList.toggle("show", !!show);
  }
  document.body.appendChild(bgmHint);
  bgmHint.addEventListener("click", function (e) { e.stopPropagation(); tryPlayBgm(); });
  if (bgm) { ["play", "pause"].forEach(function (ev) { bgm.addEventListener(ev, function () { paintBgmBtn(); }); }); }
  if (bgmBtn) {
    bgmBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      /* 아직 재생 전(대기 중)이면 버튼 탭 = 재생 시작, 음소거로 바꾸지 않음 */
      if (!bgmMuted && bgm && bgm.paused && !bgmHeldByVideo()) { tryPlayBgm(); return; }
      bgmMuted = !bgmMuted;
      try { localStorage.setItem(BGM_KEY, bgmMuted ? "1" : "0"); } catch (e) {}
      paintBgmBtn();
      if (bgmMuted) pauseBgm();
      else tryPlayBgm();
    });
  }
  document.addEventListener("play", function (e) {
    var el = e.target;
    if (!el || !el.tagName || el.tagName.toLowerCase() !== "video") return;
    pauseBgm();
    paintBgmBtn();
  }, true);
  document.addEventListener("pause", function (e) {
    var el = e.target;
    if (!el || !el.tagName || el.tagName.toLowerCase() !== "video") return;
    tryPlayBgm();
  }, true);
  document.addEventListener("ended", function (e) {
    var el = e.target;
    if (!el || !el.tagName || el.tagName.toLowerCase() !== "video") return;
    tryPlayBgm();
  }, true);
  paintBgmBtn();
  tryPlayBgm();
  window.__mariaBgm = {
    audio: function () { return bgm; },
    muted: function () { return !!bgmMuted },
    sync: tryPlayBgm,
    pause: pauseBgm,
    held: bgmHeldByVideo
  };

  /* 영상 원본: GitHub Pages 의 mp4 (카드의 data-src, build.py 가 채움). 재시도 시 ?r=시도_시각 */
  function vidSrc(v, attempt) {
    if (typeof window.__mariaSrc === "function") return window.__mariaSrc(v.id, attempt); // 로컬 테스트용 훅
    return v.src + (attempt ? (v.src.indexOf("?") < 0 ? "?" : "&") + "r=" + attempt + "_" + Date.now() : "");
  }

  /* ---------- 상단 바 ---------- */
  var bar = document.querySelector(".topbar");
  function onScroll() { bar.classList.toggle("solid", window.scrollY > 40); }
  window.addEventListener("scroll", onScroll, { passive: true });

  /* ---------- 작품 목록으로 버튼 ---------- */
  var menu = document.getElementById("works"), totop = document.querySelector(".totop");
  function upState() {
    if (!menu || !totop) return;
    var past = menu.getBoundingClientRect().bottom < 0;
    totop.classList.toggle("show", past);
    totop.tabIndex = past ? 0 : -1;
  }
  if (menu) {
    window.addEventListener("scroll", upState, { passive: true });
    window.addEventListener("resize", upState);
    upState();
    Array.prototype.forEach.call(document.querySelectorAll("a[data-up]"), function (a) {
      a.addEventListener("click", function (ev) {
        ev.preventDefault();
        var off = bar ? bar.offsetHeight : 0;
        var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        var y = menu.getBoundingClientRect().top + window.pageYOffset - off + 8;
        try { window.scrollTo({ top: Math.max(0, y), behavior: reduce ? "auto" : "smooth" }); } catch (e) { window.scrollTo(0, y); }
      });
    });
  }
  onScroll();

  /* ---------- 이미지 페이드인 ---------- */
  Array.prototype.forEach.call(document.querySelectorAll(".shot img"), function (im) {
    if (im.complete && im.naturalWidth) return;
    im.classList.add("ld");
    function done() { im.classList.remove("ld"); }
    im.addEventListener("load", done);
    im.addEventListener("error", done);
  });

  /* ---------- 등장 애니메이션 ---------- */
  var hasIO = "IntersectionObserver" in window;
  var rvs = document.querySelectorAll(".rv");
  if (hasIO) {
    var rio = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); rio.unobserve(e.target); } });
    }, { rootMargin: "0px 0px -8% 0px" });
    Array.prototype.forEach.call(rvs, function (el) { rio.observe(el); });
  } else Array.prototype.forEach.call(rvs, function (el) { el.classList.add("in"); });

  /* ---------- 영상 모달: 메인 사이트(ai-fighting) 플레이어를 그대로 옮김 ----------
     카드 탭 → 모달 열기 → innerHTML 로 <video controls playsinline webkit-playsinline autoplay preload="metadata" poster src> 를 새로 생성
     (src 는 GitHub Pages 의 mp4, 재시도 시 ?r=시도_시각). 오류 시 0.7s/1.5s 뒤 최대 2회 재시도 → 안내. 닫으면 src 제거.
     외부 iframe·미리보기 플레이어는 쓰지 않음. 화면 잘림 없음 (object-fit: contain, 영상 비율로 크기 계산) */
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; });
  }
  var VM = null, vmList = null, vmIdx = 0, vmLastFocus = null, vmToken = 0;
  function buildModal() {
    VM = document.createElement("div");
    VM.className = "vmodal";
    VM.hidden = true;
    VM.setAttribute("role", "dialog");
    VM.setAttribute("aria-modal", "true");
    VM.setAttribute("aria-labelledby", "vm-title");
    VM.innerHTML =
      '<div class="vm-box">' +
        '<div class="vm-head"><span class="vm-tag"></span><strong id="vm-title" class="vm-title"></strong>' +
        '<button type="button" class="vm-close" data-vm="close" aria-label="닫기 (Esc)" data-en-aria-label="Close (Esc)">✕</button></div>' +
        '<div class="vm-stage"><div class="vm-frame"></div></div>' +
        '<div class="vm-foot">' +
          '<div class="vm-nav"><button type="button" class="vm-btn" data-vm="prev" aria-label="이전 영상" data-en-aria-label="Previous video">‹ <span class="i18n-ko">이전</span><span class="i18n-en">Prev</span></button>' +
          '<span class="vm-count" aria-live="polite"></span>' +
          '<button type="button" class="vm-btn" data-vm="next" aria-label="다음 영상" data-en-aria-label="Next video"><span class="i18n-ko">다음</span><span class="i18n-en">Next</span> ›</button></div>' +
          '<div class="vm-iab" hidden></div>' +
        "</div>" +
      "</div>";
    document.body.appendChild(VM);
    applyAttrs(VM);
    // 영상 저장 억제: 플레이어·모달 영역의 우클릭 메뉴(길게 누르기 메뉴)와 끌어서 저장 막기
    function noSave(e) { e.preventDefault(); return false; }
    VM.addEventListener("contextmenu", noSave);
    VM.addEventListener("dragstart", noSave);
    VM.addEventListener("click", function (e) {
      if (e.target === VM) { closeModal(); return; }
      var b = e.target.closest("[data-vm]");
      if (!b) return;
      var a = b.getAttribute("data-vm");
      if (a === "close") closeModal();
      else if (a === "prev") showVideo(vmIdx - 1);
      else if (a === "next") showVideo(vmIdx + 1);
    });
    window.addEventListener("resize", sizeFrame);
  }
  function sizeFrame() {
    if (!VM || VM.hidden || !vmList) return;
    var v = vmList[vmIdx];
    var frame = VM.querySelector(".vm-frame");
    var head = VM.querySelector(".vm-head").offsetHeight, foot = VM.querySelector(".vm-foot").offsetHeight;
    var vw = window.innerWidth, vh = window.innerHeight;
    var maxW = Math.min(vw - (vw <= 640 ? 16 : 48), 1200);
    var maxH = vh - head - foot - (vw <= 640 ? 24 : 56);
    var r = (v.w || 16) / (v.h || 9);
    var w = maxW, h = w / r;
    if (h > maxH) { h = Math.max(160, maxH); w = h * r; }
    if (w > maxW) { w = maxW; h = w / r; }
    frame.style.width = Math.round(w) + "px";
    frame.style.height = Math.round(h) + "px";
    VM.querySelector(".vm-box").style.width = Math.max(Math.round(w), Math.min(maxW, 320)) + "px";
  }
  /* 재생 방식 (Threads·Instagram 인앱 브라우저 대응)
     - 인앱 브라우저(안드로이드 WebView, iOS WKWebView)는 '탭하는 그 순간' 호출된 play() 만 소리 있는 재생으로 인정함.
       autoplay 속성만으로는 시작되지 않음 → 카드 탭 처리 안에서 바로 play() 를 부름.
     - 한 번 탭으로 허락받은 <video> 요소를 재시도·blob 재생·이전/다음에 그대로 다시 씀 (허락이 요소에 남음).
     - 순서: 기본 플레이어(GitHub mp4) → (Meta 인앱이 아니면) 새 주소로 한 번 더 → 통째로 내려받아 blob 으로 재생 → 안내.
     - play() 가 거부되면(NotAllowedError) 빨간 재생 버튼을 다시 보여 줌 → 한 번 더 탭하면 재생.
     - Meta 인앱 브라우저에서 끝내 실패하면 아래에 'Chrome 으로 열기'(안드로이드) / '링크 복사'(iOS) 안내. iframe 은 쓰지 않음. */
  var UA = navigator.userAgent || "";
  var META_IAB = /\b(Barcelona|Instagram|FBAN|FBAV|FB_IAB|FBIOS|FB4A)\b/i.test(UA);
  var IS_ANDROID = /Android/i.test(UA);
  var IS_IOS = /iPhone|iPad|iPod/i.test(UA) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  var PLAN = META_IAB ? ["native", "blob"] : ["native", "native", "blob"];
  var STALL_MS = 8000, BLOB_IDLE_MS = 20000;
  var cur = null, vmBlobUrl = null, vmAbort = null;
  function dropBlob() {
    if (vmAbort) { try { vmAbort.abort(); } catch (e) {} vmAbort = null; }
    if (vmBlobUrl) { try { URL.revokeObjectURL(vmBlobUrl); } catch (e) {} vmBlobUrl = null; }
  }
  function releaseSrc(x) { try { x.pause(); x.removeAttribute("src"); x.load(); } catch (e) {} }
  function releaseVideos(root) {
    // 닫힌 영상의 네트워크·디코더를 즉시 해제 (휴대폰 미디어 플레이어 수 제한 대비)
    Array.prototype.forEach.call(root.querySelectorAll("video"), releaseSrc);
  }
  function setLoading(t) { var l = VM.querySelector(".vm-loading"); if (l) l.textContent = t; }
  function showTap(on) { var b = VM.querySelector(".vm-tap"); if (b) b.hidden = !on; }
  function clearStall() { if (cur && cur.stall) { clearTimeout(cur.stall); cur.stall = 0; } }
  function armStall() {
    clearStall();
    var c = cur;
    c.stall = setTimeout(function () {
      if (cur !== c) return;
      c.stall = 0;
      var vid = VM.querySelector(".vm-frame video");
      if (!vid || c.ok || !(VM.querySelector(".vm-tap") || { hidden: true }).hidden || vid.currentTime > 0.1) return;
      nextStep("stall");
    }, STALL_MS);
  }
  function doPlay(vid) {
    var p;
    try { p = vid.play(); } catch (e) { return; }
    if (p && p.then) p.then(function () { showTap(false); }, function (err) {
      if (!cur || !vid.getAttribute("src")) return;
      // 자동재생 제한: 다음 탭에서 재생 (실패로 치지 않음). 그 밖의 오류는 error 이벤트·멈춤 감시가 처리
      if (err && err.name === "NotAllowedError") { clearStall(); showTap(true); }
    });
  }
  function ensurePlayer(frame) {
    var vid = frame.querySelector("video");
    if (vid) return vid;
    frame.innerHTML = '<div class="vm-loading">' + T("영상 불러오는 중…", "Loading video…") + '</div>' +
      '<video controls playsinline webkit-playsinline autoplay preload="metadata" controlslist="nodownload noremoteplayback" disablepictureinpicture draggable="false"></video>' +
      '<button type="button" class="vm-tap" hidden aria-label="' + T("영상 재생", "Play video") + '"><span class="play" aria-hidden="true"></span></button>';
    vid = frame.querySelector("video");
    // 다운로드·PIP·원격 재생 메뉴 숨김 (속성 + 프로퍼티 둘 다)
    vid.setAttribute("controlslist", "nodownload noremoteplayback");
    try { if (vid.controlsList && vid.controlsList.add) { vid.controlsList.add("nodownload"); vid.controlsList.add("noremoteplayback"); } } catch (e) {}
    vid.setAttribute("disablepictureinpicture", "");
    try { vid.disablePictureInPicture = true; } catch (e) {}
    vid.setAttribute("draggable", "false");
    vid.draggable = false;
    vid.addEventListener("contextmenu", function (e) { e.preventDefault(); });
    vid.addEventListener("dragstart", function (e) { e.preventDefault(); });
    vid.addEventListener("loadedmetadata", function () {
      var v = cur && cur.v;
      if (v && vid.videoWidth && vid.videoHeight && (vid.videoWidth !== v.w || vid.videoHeight !== v.h)) {
        v.w = vid.videoWidth; v.h = vid.videoHeight; sizeFrame();
      }
    });
    vid.addEventListener("error", function () {
      if (!cur || !vid.getAttribute("src")) return;
      if (vid.error && vid.error.code) cur.code = vid.error.code;
      nextStep(cur.code);
    });
    function ok() { if (cur && vid.getAttribute("src")) { cur.ok = true; clearStall(); showTap(false); } }
    vid.addEventListener("playing", ok);
    vid.addEventListener("timeupdate", function () { if (vid.currentTime > 0.1 && !vid.paused) ok(); });
    frame.querySelector(".vm-tap").addEventListener("click", function () { showTap(false); doPlay(vid); if (cur && !cur.ok) armStall(); });
    return vid;
  }
  function runStep() {
    var c = cur, frame = VM.querySelector(".vm-frame");
    var vid = ensurePlayer(frame);
    c.ok = false;
    showTap(false);
    vid.setAttribute("poster", c.v.poster || "");
    vid.setAttribute("title", c.v.title);
    if (PLAN[c.step] === "native") {
      setLoading(T("영상 불러오는 중…", "Loading video…"));
      vid.src = vidSrc(c.v, c.step);
      doPlay(vid);      // 탭 처리 중에 바로 play() — 인앱 브라우저 자동재생 제한 통과
      armStall();
      return;
    }
    // blob: 영상 원본을 통째로 받아 이 사이트 주소(blob:)로 재생 — 스트리밍(Range)·교차 출처 미디어 문제 우회
    clearStall();
    releaseSrc(vid);
    dropBlob();
    setLoading(T("영상 내려받는 중…", "Downloading video…"));
    if (!window.fetch || !window.URL || !URL.createObjectURL) { fail(c.code); return; }
    var ctl = window.AbortController ? new AbortController() : null;
    vmAbort = ctl;
    var idle = 0;
    function poke() { clearTimeout(idle); idle = setTimeout(function () { if (ctl) try { ctl.abort(); } catch (e) {} }, BLOB_IDLE_MS); }
    poke();
    fetch(vidSrc(c.v, c.step), { credentials: "omit", cache: "no-store", signal: ctl ? ctl.signal : undefined }).then(function (res) {
      if (!res.ok) throw new Error("HTTP " + res.status);
      var total = +res.headers.get("content-length") || 0;
      if (!res.body || !res.body.getReader) return res.blob();
      var rd = res.body.getReader(), parts = [], got = 0;
      return (function pump() {
        return rd.read().then(function (r) {
          if (cur !== c) { try { rd.cancel(); } catch (e) {} throw new Error("cancel"); }
          if (r.done) return new Blob(parts, { type: "video/mp4" });
          parts.push(r.value); got += r.value.length; poke();
          if (total) setLoading(T("영상 내려받는 중… ", "Downloading video… ") + Math.min(99, Math.floor(got * 100 / total)) + "%");
          return pump();
        });
      })();
    }).then(function (blob) {
      clearTimeout(idle);
      if (cur !== c) return;
      vmAbort = null;
      if (blob.type !== "video/mp4") blob = blob.slice(0, blob.size, "video/mp4");
      vmBlobUrl = URL.createObjectURL(blob);
      setLoading(T("영상 불러오는 중…", "Loading video…"));
      vid.src = vmBlobUrl;
      doPlay(vid);      // 같은 요소라서 처음 탭의 허락이 남아 있음. 막히면 재생 버튼 표시
      armStall();
    }).catch(function () {
      clearTimeout(idle);
      if (cur === c) fail(c.code);
    });
  }
  function nextStep(code) {
    var c = cur;
    if (!c) return;
    if (code && code !== "stall") c.code = code;
    clearStall();
    var vid = VM.querySelector(".vm-frame video");
    if (vid) releaseSrc(vid);
    c.step++;
    if (c.step >= PLAN.length) { fail(c.code); return; }
    setTimeout(function () { if (cur === c) runStep(); }, PLAN[c.step] === "native" ? 700 : 700 + (c.step - 1) * 800);
  }
  function fail(code) {
    var c = cur, frame = VM.querySelector(".vm-frame");
    clearStall();
    dropBlob();
    releaseVideos(frame);
    // 다른 플레이어로 바꾸지 않고 사이트 플레이어 자리에서 안내 (크기 유지)
    frame.innerHTML = '<div class="vm-fail"><p>' + T("영상을 불러오지 못했어요", "Couldn't load the video") + (code && code !== "stall" ? " (" + code + ")" : "") + '.</p>' +
      '<button type="button" class="vm-retry">' + T("다시 시도", "Try again") + '</button></div>';
    frame.querySelector(".vm-retry").addEventListener("click", function () { startVideo(c.v, true); });
    if (META_IAB) showIab(true);
  }
  /* Meta(Threads·Instagram·Facebook) 인앱 브라우저에서 실패했을 때만: 기본 브라우저로 열기 안내 */
  function pageUrl() { return location.href.split("#")[0]; }
  function showIab(on) {
    var box = VM.querySelector(".vm-iab");
    if (!on) { box.hidden = true; return; }
    var u = pageUrl(), rest = u.replace(/^https?:\/\//, "");
    var h = "<p>" + T("Threads·Instagram 앱 안의 브라우저에서는 영상이 재생되지 않을 수 있어요. " + (IS_IOS ? "Safari" : "Chrome") + " 같은 기본 브라우저로 열어 주세요.",
      "Videos may not play in the Threads/Instagram in-app browser. Please open this page in your default browser, such as " + (IS_IOS ? "Safari" : "Chrome") + ".") +
      "</p><div class=\"vm-iab-row\">";
    if (IS_ANDROID) h += '<a class="vm-btn vm-open-ext" href="intent://' + esc(rest) + "#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=" +
      encodeURIComponent(u) + ';end">' + T("Chrome 으로 열기 ↗", "Open in Chrome ↗") + '</a>';
    h += '<button type="button" class="vm-btn vm-copy">' + T("링크 복사", "Copy link") + '</button></div>';
    if (!IS_ANDROID) h += '<p class="vm-iab-tip">' + T("링크를 복사해 Safari 에 붙여 넣거나, 오른쪽 위 ··· 메뉴에서 ‘외부 브라우저에서 열기’ 를 눌러 주세요.", "Copy the link and paste it into Safari, or tap the ··· menu at the top right and choose ‘Open in external browser’.") + '</p>';
    h += '<p class="vm-iab-url">' + esc(u) + "</p>";
    box.innerHTML = h;
    box.hidden = false;
    box.querySelector(".vm-copy").addEventListener("click", function () {
      var b = this;
      function done(okc) { b.textContent = okc ? T("복사했어요 ✓", "Copied ✓") : T("아래 주소를 길게 눌러 복사", "Long-press the address below to copy"); }
      function legacy() {
        var t = document.createElement("textarea");
        t.value = u; t.setAttribute("readonly", ""); t.style.cssText = "position:fixed;top:0;left:0;opacity:0";
        document.body.appendChild(t); t.select();
        try { t.setSelectionRange(0, u.length); } catch (e) {}
        var r = false; try { r = document.execCommand("copy"); } catch (e) {}
        t.remove(); done(r);
      }
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(u).then(function () { done(true); }, legacy);
      else legacy();
    });
    sizeFrame();
  }
  function startVideo(v, fresh) {
    var frame = VM.querySelector(".vm-frame");
    if (cur) clearStall();
    dropBlob();
    if (fresh) { releaseVideos(frame); frame.innerHTML = ""; }
    if (frame.querySelector(".vm-fail")) frame.innerHTML = "";
    showIab(false);
    cur = { token: ++vmToken, v: v, step: 0, ok: false, code: 0, stall: 0 };
    runStep();
  }
  function showVideo(i) {
    var n = vmList.length;
    vmIdx = (i + n) % n;
    var v = vmList[vmIdx];
    VM.querySelector(".vm-title").textContent = v.title;
    startVideo(v, false);
    VM.querySelector(".vm-count").textContent = (vmIdx + 1) + " / " + n;
    sizeFrame();
  }
  function openModal(card) {
    var films = card.closest(".films");
    var cards = Array.prototype.slice.call(films.querySelectorAll(".vcard[data-src]"));
    if (!VM) buildModal();
    vmList = cards.map(function (c) {
      var im = c.querySelector("img.pthumb");
      return { id: c.getAttribute("data-id"), src: c.getAttribute("data-src"), title: c.getAttribute("data-title") || "MARIA", w: 16, h: 9, poster: im ? im.getAttribute("src") : "" };
    });
    vmLastFocus = card;
    VM.querySelector(".vm-tag").textContent = films.getAttribute("data-label") || "";
    VM.classList.toggle("multi", cards.length > 1);
    VM.hidden = false;
    document.documentElement.classList.add("vm-open");
    showVideo(cards.indexOf(card));
    VM.querySelector(".vm-close").focus();
  }
  function closeModal() {
    if (!VM || VM.hidden) return;
    vmToken++;
    clearStall();
    cur = null;
    dropBlob();
    releaseVideos(VM.querySelector(".vm-frame"));
    VM.querySelector(".vm-frame").innerHTML = "";  // 재생 중지
    showIab(false);
    VM.hidden = true;
    document.documentElement.classList.remove("vm-open");
    vmList = null;
    if (vmLastFocus && vmLastFocus.focus) try { vmLastFocus.focus({ preventScroll: true }); } catch (e) {}
    if (typeof tryPlayBgm === "function") tryPlayBgm();
  }
  document.addEventListener("keydown", function (e) {
    if (!VM || VM.hidden) return;
    if (e.key === "Escape") { e.preventDefault(); closeModal(); }
    else if (vmList && vmList.length > 1 && e.key === "ArrowLeft") showVideo(vmIdx - 1);
    else if (vmList && vmList.length > 1 && e.key === "ArrowRight") showVideo(vmIdx + 1);
    else if (e.key === "Tab") {
      // 포커스 가두기
      var f = Array.prototype.filter.call(VM.querySelectorAll("button, a[href]"), function (x) { return x.offsetParent !== null; });
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });
  document.addEventListener("click", function (e) {
    var pl = e.target.closest && e.target.closest('.vcard[data-act="play"]');
    if (pl) openModal(pl);
  });
  document.addEventListener("keydown", function (e) {
    if ((e.key === "Enter" || e.key === " ") && e.target.classList && e.target.classList.contains("vcard")) {
      e.preventDefault();
      openModal(e.target);
    }
  });
  window.__mariaVideo = { open: function (i) { openModal(document.querySelectorAll(".vcard")[i]); }, close: closeModal,
    state: function () { return cur ? { step: cur.step, kind: PLAN[cur.step], ok: cur.ok, code: cur.code } : null; }, plan: PLAN, metaIab: META_IAB };  // 테스트·진단용

  /* ---------- 설화 웹툰 ----------
     build.py 의 WEBTOONS 가 .wt 블록을 만든다 (data-wt-ko / data-wt-en = 조각 [가로,세로] 목록, data-wt-base = GitHub Pages 주소).
     처음 펼칠 때만 이미지를 불러옴. 언어를 바꾸면 펼쳐진 웹툰은 즉시 교체, 접힌 웹툰은 다음에 펼칠 때 새 언어로. */
  (function () {
    function noSave(e) { e.preventDefault(); return false; }
    function langOf() { return isEn() ? "en" : "ko"; }
    function render(box) {
      var l = langOf(), strip = box.querySelector(".wt-strip");
      if (box.getAttribute("data-wt-loaded") === l) return;
      var sizes = []; try { sizes = JSON.parse(box.getAttribute("data-wt-" + l) || "[]"); } catch (e) {}
      var base = box.getAttribute("data-wt-base"), no = box.getAttribute("data-wt"), rev = box.getAttribute("data-wt-rev");
      var frag = document.createDocumentFragment();
      sizes.forEach(function (wh, i) {
        var im = document.createElement("img");
        im.decoding = "async";
        im.width = wh[0]; im.height = wh[1];
        im.alt = i === 0 ? T("MARIA No. " + no + " 설화 웹툰", "MARIA No. " + no + " lore webtoon") : "";
        im.setAttribute("draggable", "false"); im.draggable = false;
        im.addEventListener("contextmenu", noSave); im.addEventListener("dragstart", noSave);
        im.src = base + l + "/" + (i < 9 ? "0" : "") + (i + 1) + ".webp" + (rev ? "?r=" + encodeURIComponent(rev) : "");
        frag.appendChild(im);
      });
      strip.innerHTML = "";
      strip.appendChild(frag);
      box.setAttribute("data-wt-loaded", l);
    }
    function setOpen(box, on) {
      var btn = box.querySelector(".wt-btn"), panel = box.querySelector(".wt-panel");
      if (on) render(box);
      panel.hidden = !on;
      box.classList.toggle("open", on);
      btn.setAttribute("aria-expanded", on ? "true" : "false");
    }
    var boxes = document.querySelectorAll(".wt[data-wt]");
    Array.prototype.forEach.call(boxes, function (box) {
      var btn = box.querySelector(".wt-btn"), panel = box.querySelector(".wt-panel");
      ["contextmenu", "dragstart", "selectstart"].forEach(function (ev) { panel.addEventListener(ev, function (e) { if (!(e.target.closest && e.target.closest(".wt-close"))) e.preventDefault(); }); });
      btn.addEventListener("click", function () { setOpen(box, panel.hidden); });
      box.querySelector(".wt-close").addEventListener("click", function () {
        setOpen(box, false);
        try { btn.scrollIntoView({ block: "center" }); } catch (e) { btn.scrollIntoView(); }
        try { btn.focus({ preventScroll: true }); } catch (e) {}
      });
    });
    document.addEventListener("maria:lang", function () {
      Array.prototype.forEach.call(boxes, function (box) {
        if (!box.querySelector(".wt-panel").hidden) render(box);
        else if (box.getAttribute("data-wt-loaded")) { box.querySelector(".wt-strip").innerHTML = ""; box.removeAttribute("data-wt-loaded"); }
      });
    });
    window.__mariaWebtoon = { open: function (n) { var b = document.getElementById("wt-" + n); if (b) setOpen(b, true); }, close: function (n) { var b = document.getElementById("wt-" + n); if (b) setOpen(b, false); } };  // 테스트용
  })();

  /* ---------- 라이트박스 ---------- */
  var lb = document.querySelector(".lb"), lbImg = lb.querySelector("img"), lbCount = lb.querySelector(".lb-count");
  var cur = [], idx = 0, label = "", lastFocus = null;
  function show(i) {
    idx = (i + cur.length) % cur.length;
    var a = cur[idx];
    lbImg.src = a.getAttribute("href");
    lbImg.alt = a.querySelector("img").alt;
    lbCount.textContent = label + " · " + (idx + 1) + " / " + cur.length;
  }
  function open(a) {
    var g = a.closest(".gallery");
    cur = Array.prototype.slice.call(g.querySelectorAll("a.shot"));
    label = g.getAttribute("data-label") || "";
    lastFocus = a;
    lb.hidden = false;
    document.documentElement.classList.add("lb-open");
    show(cur.indexOf(a));
    lb.querySelector(".lb-x").focus();
  }
  function close() {
    lb.hidden = true;
    lbImg.removeAttribute("src");
    document.documentElement.classList.remove("lb-open");
    if (lastFocus) try { lastFocus.focus({ preventScroll: true }); } catch (e) {}
  }
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("a.shot");
    if (a) { e.preventDefault(); open(a); }
  });
  lb.addEventListener("click", function (e) {
    var b = e.target.closest("button");
    if (b && b.classList.contains("lb-x")) close();
    else if (b && b.classList.contains("lb-prev")) show(idx - 1);
    else if (b && b.classList.contains("lb-next")) show(idx + 1);
    else if (e.target === lb) close();
  });
  document.addEventListener("keydown", function (e) {
    if (lb.hidden) return;
    if (e.key === "Escape") close();
    else if (e.key === "ArrowLeft") show(idx - 1);
    else if (e.key === "ArrowRight") show(idx + 1);
  });
  var sx = 0, sy = 0;
  lb.addEventListener("touchstart", function (e) { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
  lb.addEventListener("touchend", function (e) {
    var dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) show(idx + (dx < 0 ? 1 : -1));
    else if (dy > 90 && Math.abs(dy) > Math.abs(dx)) close();
  }, { passive: true });
  /* ---------- 앱으로 설치 (PWA) ----------
     - 이미 홈 화면 앱(standalone)으로 실행 중이면 버튼 숨김
     - 안드로이드/크롬: beforeinstallprompt 로 설치 창. 이벤트가 없으면 브라우저 메뉴 안내
     - iOS: 공유 버튼 → 홈 화면에 추가 안내 / 인앱 브라우저: Safari·Chrome 으로 열기 안내
     - 서비스워커(sw.js)는 같은 경로에 실제로 있을 때만 등록, 없으면 조용히 무시 */
  (function () {
    var btn = document.querySelector(".appinst"), help = document.getElementById("appinst-help");
    var ua = navigator.userAgent || "";
    var standalone = false;
    try { standalone = window.matchMedia("(display-mode: standalone)").matches || window.matchMedia("(display-mode: fullscreen)").matches || window.navigator.standalone === true; } catch (e) {}
    var ios = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    var android = /Android/i.test(ua);
    var iab = /Instagram|FBAN|FBAV|FB_IAB|Barcelona|Threads|KAKAOTALK|NAVER\(inapp|Line\/|DaumApps|everytimeApp|; wv\)/i.test(ua);
    var deferred = null;
    var state = { standalone: standalone, ios: ios, android: android, iab: iab, shown: false, prompted: false, sw: "skip" };
    window.__mariaPWA = state;
    if (standalone) HTML.classList.add("is-app");
    function show(on) { if (!btn) return; btn.hidden = !on; state.shown = !!on; if (!on && help) { help.hidden = true; btn.setAttribute("aria-expanded", "false"); } }
    function openHelp(mode) {
      if (!help) return;
      var open = help.hidden || help.getAttribute("data-mode") !== mode;
      help.setAttribute("data-mode", mode);
      help.hidden = !open;
      btn.setAttribute("aria-expanded", open ? "true" : "false");
    }
    if (btn && !standalone) {
      if (iab || ios || android) show(true);   /* 데스크톱 크롬 등은 beforeinstallprompt 가 올 때만 표시 */
      window.addEventListener("beforeinstallprompt", function (e) {
        e.preventDefault(); deferred = e; state.bip = true; show(true);
      });
      window.addEventListener("appinstalled", function () { deferred = null; state.installed = true; show(false); });
      btn.addEventListener("click", function () {
        if (deferred) {
          var d = deferred; deferred = null; state.prompted = true;
          try {
            d.prompt();
            if (d.userChoice && d.userChoice.then) d.userChoice.then(function (r) { if (r && r.outcome === "accepted") show(false); }, function () {});
          } catch (e) { openHelp(ios ? "ios" : "android"); }
          return;
        }
        openHelp(iab ? "iab" : ios ? "ios" : "android");
      });
    }
    /* 서비스워커: freehtmlhost 가 sw.js 를 서빙할 때만 (JS 로 응답할 때만) 등록 */
    if ("serviceWorker" in navigator && window.isSecureContext && window.fetch) {
      window.addEventListener("load", function () {
        fetch("sw.js", { method: "GET", cache: "no-store", credentials: "same-origin" }).then(function (r) {
          var ct = (r.headers.get("content-type") || "").toLowerCase();
          if (!r.ok || ct.indexOf("javascript") < 0) { state.sw = "absent"; return; }
          return r.text().then(function (t) {
            if (t.indexOf("MARIA-SW") < 0) { state.sw = "absent"; return; }
            return navigator.serviceWorker.register("sw.js", { scope: "./" }).then(function () { state.sw = "registered"; });
          });
        }).catch(function () { state.sw = "failed"; });
      });
    }
  })();
})();
