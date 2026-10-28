(function () {
  "use strict";
  document.documentElement.classList.remove("no-js");

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
        '<button type="button" class="vm-close" data-vm="close" aria-label="닫기 (Esc)">✕</button></div>' +
        '<div class="vm-stage"><div class="vm-frame"></div></div>' +
        '<div class="vm-foot">' +
          '<div class="vm-nav"><button type="button" class="vm-btn" data-vm="prev" aria-label="이전 영상">‹ 이전</button>' +
          '<span class="vm-count" aria-live="polite"></span>' +
          '<button type="button" class="vm-btn" data-vm="next" aria-label="다음 영상">다음 ›</button></div>' +
          '<div class="vm-iab" hidden></div>' +
        "</div>" +
      "</div>";
    document.body.appendChild(VM);
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
    frame.innerHTML = '<div class="vm-loading">영상 불러오는 중…</div>' +
      '<video controls playsinline webkit-playsinline autoplay preload="metadata" controlslist="nodownload noremoteplayback" disablepictureinpicture draggable="false"></video>' +
      '<button type="button" class="vm-tap" hidden aria-label="영상 재생"><span class="play" aria-hidden="true"></span></button>';
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
      setLoading("영상 불러오는 중…");
      vid.src = vidSrc(c.v, c.step);
      doPlay(vid);      // 탭 처리 중에 바로 play() — 인앱 브라우저 자동재생 제한 통과
      armStall();
      return;
    }
    // blob: 영상 원본을 통째로 받아 이 사이트 주소(blob:)로 재생 — 스트리밍(Range)·교차 출처 미디어 문제 우회
    clearStall();
    releaseSrc(vid);
    dropBlob();
    setLoading("영상 내려받는 중…");
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
          if (total) setLoading("영상 내려받는 중… " + Math.min(99, Math.floor(got * 100 / total)) + "%");
          return pump();
        });
      })();
    }).then(function (blob) {
      clearTimeout(idle);
      if (cur !== c) return;
      vmAbort = null;
      if (blob.type !== "video/mp4") blob = blob.slice(0, blob.size, "video/mp4");
      vmBlobUrl = URL.createObjectURL(blob);
      setLoading("영상 불러오는 중…");
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
    frame.innerHTML = '<div class="vm-fail"><p>영상을 불러오지 못했어요' + (code && code !== "stall" ? " (" + code + ")" : "") + '.</p>' +
      '<button type="button" class="vm-retry">다시 시도</button></div>';
    frame.querySelector(".vm-retry").addEventListener("click", function () { startVideo(c.v, true); });
    if (META_IAB) showIab(true);
  }
  /* Meta(Threads·Instagram·Facebook) 인앱 브라우저에서 실패했을 때만: 기본 브라우저로 열기 안내 */
  function pageUrl() { return location.href.split("#")[0]; }
  function showIab(on) {
    var box = VM.querySelector(".vm-iab");
    if (!on) { box.hidden = true; return; }
    var u = pageUrl(), rest = u.replace(/^https?:\/\//, "");
    var h = "<p>Threads·Instagram 앱 안의 브라우저에서는 영상이 재생되지 않을 수 있어요. " +
      (IS_IOS ? "Safari" : "Chrome") + " 같은 기본 브라우저로 열어 주세요.</p><div class=\"vm-iab-row\">";
    if (IS_ANDROID) h += '<a class="vm-btn vm-open-ext" href="intent://' + esc(rest) + "#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=" +
      encodeURIComponent(u) + ';end">Chrome 으로 열기 ↗</a>';
    h += '<button type="button" class="vm-btn vm-copy">링크 복사</button></div>';
    if (!IS_ANDROID) h += '<p class="vm-iab-tip">링크를 복사해 Safari 에 붙여 넣거나, 오른쪽 위 ··· 메뉴에서 ‘외부 브라우저에서 열기’ 를 눌러 주세요.</p>';
    h += '<p class="vm-iab-url">' + esc(u) + "</p>";
    box.innerHTML = h;
    box.hidden = false;
    box.querySelector(".vm-copy").addEventListener("click", function () {
      var b = this;
      function done(okc) { b.textContent = okc ? "복사했어요 ✓" : "아래 주소를 길게 눌러 복사"; }
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
})();
