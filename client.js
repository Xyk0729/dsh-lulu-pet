/**
 * dsh-lulu-pet — Client half.
 *
 * Draws 噜噜 as a transparent overlay in the Harness page: idle clips rotate,
 * a click answers with a wave or a hop, dragging moves her, and a random meme
 * sticker pops out now and then. Everything is local: the Host half only serves
 * the WebM/PNG assets under /dsh-lulu-pet.
 */
window.__ModuleLoader__.load({
  id: 'dsh-lulu-pet',
  factory(require) {
    const React = require('react');
    const h = React.createElement;

    const NS = 'lulu-pet';
    const ROUTE = '/dsh-lulu-pet';
    const PREFS_KEY = 'dsh-lulu-pet.prefs';
    const CSS_TAG = 'dsh-lulu-pet/style.css';

    const IDLE = ['待机呼吸休闲', '待机-转圈', '待机-喝水', '待机-伸懒腰', '待机-整理斜挎包'];
    const CLICK = ['点击回应-元气挥手', '点击回应-开心跃动'];
    const TURN = '东张西望';
    const MEMES = [
      '开心', '卖萌', '惊讶', '大哭', '温柔', '委屈', '无语', '溜达', '凝视',
      '乖巧', '打工', '困了', '打哈欠', '嗨', '发呆', '得意', '拜拜', '冲刺',
      '躺平', '泡澡', '看书', '出门', '听歌', '下班', '晚安', '等你', '嘟嘟嘴',
    ];
    const CORNERS = ['bottom-right', 'bottom-left', 'top-right', 'top-left'];

    const DEFAULTS = {
      enabled: true,
      size: 462,
      corner: 'bottom-right',
      dx: 0,
      dy: 0,
      memes: true,
    };

    const DICT = {
      en: {
        nav: 'Lulu pet',
        'settings.enabled': 'Show the pet',
        'settings.size': 'Size',
        'settings.corner': 'Corner',
        'settings.memes': 'Pop sticker memes',
        'settings.reset': 'Reset position',
        'settings.note': 'Drag 噜噜 anywhere in this window. Preferences are stored in this browser.',
        'corner.bottom-right': 'Bottom right',
        'corner.bottom-left': 'Bottom left',
        'corner.top-right': 'Top right',
        'corner.top-left': 'Top left',
      },
      zh: {
        nav: '噜噜桌宠',
        'settings.enabled': '显示桌宠',
        'settings.size': '大小',
        'settings.corner': '停靠角落',
        'settings.memes': '偶尔冒表情包',
        'settings.reset': '回到默认位置',
        'settings.note': '直接把噜噜拖到窗口任意位置即可。设置只保存在这个浏览器里。',
        'corner.bottom-right': '右下角',
        'corner.bottom-left': '左下角',
        'corner.top-right': '右上角',
        'corner.top-left': '左上角',
      },
    };

    function readPrefs() {
      try {
        const raw = window.localStorage.getItem(PREFS_KEY);
        if (!raw) return { ...DEFAULTS };
        const parsed = JSON.parse(raw);
        return {
          ...DEFAULTS,
          ...(parsed && typeof parsed === 'object' ? parsed : {}),
        };
      } catch {
        return { ...DEFAULTS };
      }
    }

    const store = {
      prefs: readPrefs(),
      subs: new Set(),
    };

    function updatePrefs(patch) {
      store.prefs = { ...store.prefs, ...patch };
      try {
        window.localStorage.setItem(PREFS_KEY, JSON.stringify(store.prefs));
      } catch {
        /* private mode: keep the in-memory value */
      }
      for (const fn of store.subs) fn(store.prefs);
    }

    function usePrefs() {
      const [prefs, setPrefs] = React.useState(store.prefs);
      React.useEffect(() => {
        const fn = (next) => setPrefs(next);
        store.subs.add(fn);
        setPrefs(store.prefs);
        return () => store.subs.delete(fn);
      }, []);
      return prefs;
    }

    function pick(pool, avoid) {
      const choices = avoid === undefined ? pool : pool.filter((name) => name !== avoid);
      if (choices.length === 0) return pool[0];
      return choices[Math.floor(Math.random() * choices.length)];
    }

    const CSS = [
      '.llp-root{position:fixed;z-index:60;pointer-events:none;user-select:none;-webkit-user-select:none}',
      '.llp-root[data-corner="bottom-right"]{right:24px;bottom:8px}',
      '.llp-root[data-corner="bottom-left"]{left:24px;bottom:8px}',
      '.llp-root[data-corner="top-right"]{right:24px;top:8px}',
      '.llp-root[data-corner="top-left"]{left:24px;top:8px}',
      '.llp-stage{position:relative;width:var(--llp-size,462px);height:calc(var(--llp-size,462px)*9/16);pointer-events:none}',
      '.llp-video{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;pointer-events:none;background:transparent}',
      '.llp-hit{position:absolute;left:32%;top:10%;width:36%;height:86%;pointer-events:auto;cursor:grab;touch-action:none;border-radius:40%}',
      '.llp-hit.llp-dragging{cursor:grabbing}',
      '.llp-bubble{position:absolute;left:50%;bottom:88%;transform:translateX(-50%);pointer-events:none;filter:drop-shadow(0 6px 14px rgba(0,0,0,.18))}',
      '.llp-bubble img{display:block;width:150px;height:150px;border-radius:18px;border:3px solid rgba(255,255,255,.95);background:#fff;object-fit:cover}',
      '.llp-settings{display:flex;flex-direction:column;gap:14px;padding:4px 0 8px}',
      '.llp-row{display:flex;align-items:center;gap:12px;font-size:13px}',
      '.llp-row>span:first-child{flex:0 0 96px;opacity:.8}',
      '.llp-row input[type="range"]{flex:1;max-width:260px}',
      '.llp-row select,.llp-row button{font:inherit;font-size:13px;padding:4px 8px;border-radius:8px;border:1px solid rgba(128,128,128,.45);background:transparent;color:inherit}',
      '.llp-row button{cursor:pointer}',
      '.llp-note{font-size:12px;opacity:.65;margin:0;line-height:1.6}',
      '@media (prefers-reduced-motion: reduce){.llp-video{transition:none}}',
    ].join('\n');

    function injectCss() {
      if (document.querySelector(`style[data-plugin-css="${CSS_TAG}"]`) !== null) return () => {};
      const style = document.createElement('style');
      style.dataset.pluginCss = CSS_TAG;
      style.textContent = CSS;
      document.head.appendChild(style);
      return () => {
        style.remove();
      };
    }

    function PetOverlay() {
      const prefs = usePrefs();
      const [anim, setAnim] = React.useState(IDLE[0]);
      const [meme, setMeme] = React.useState(null);
      const [live, setLive] = React.useState({ dx: 0, dy: 0 });
      const [dragging, setDragging] = React.useState(false);
      const rootRef = React.useRef(null);
      const videoRef = React.useRef(null);
      const dragRef = React.useRef(null);
      const animRef = React.useRef(anim);
      animRef.current = anim;

      // Load and play the current clip.
      React.useEffect(() => {
        const video = videoRef.current;
        if (!video) return;
        video.src = `${ROUTE}/anim/${encodeURIComponent(anim)}.webm`;
        video.load();
        const started = video.play();
        if (started && typeof started.catch === 'function') started.catch(() => {});
      }, [anim]);

      // Random meme sticker.
      React.useEffect(() => {
        if (!prefs.enabled || !prefs.memes) return;
        let timer;
        let clear;
        const schedule = () => {
          timer = window.setTimeout(() => {
            setMeme((current) => pick(MEMES, current));
            clear = window.setTimeout(() => setMeme(null), 4200);
            schedule();
          }, 50000 + Math.random() * 50000);
        };
        schedule();
        return () => {
          window.clearTimeout(timer);
          window.clearTimeout(clear);
        };
      }, [prefs.enabled, prefs.memes]);

      // Keep the stage inside the viewport after size/corner/drag changes.
      React.useEffect(() => {
        const root = rootRef.current;
        if (!root) return;
        const rect = root.getBoundingClientRect();
        let dx = prefs.dx;
        let dy = prefs.dy;
        const margin = 8;
        if (rect.left < margin) dx += margin - rect.left;
        if (rect.top < margin) dy += margin - rect.top;
        if (rect.right > window.innerWidth - margin) dx -= rect.right - (window.innerWidth - margin);
        if (rect.bottom > window.innerHeight - margin) dy -= rect.bottom - (window.innerHeight - margin);
        if (dx !== prefs.dx || dy !== prefs.dy) updatePrefs({ dx, dy });
      }, [prefs.dx, prefs.dy, prefs.size, prefs.corner]);

      if (!prefs.enabled) return null;

      const next = () => {
        const current = animRef.current;
        if (CLICK.includes(current) || current === TURN) {
          setAnim(pick(IDLE, current));
          return;
        }
        if (Math.random() < 0.16) {
          setAnim(TURN);
          return;
        }
        setAnim(pick(IDLE, current));
      };

      const onPointerDown = (event) => {
        if (event.button !== 0) return;
        event.preventDefault();
        event.stopPropagation();
        const root = rootRef.current;
        if (!root) return;
        dragRef.current = {
          pointerId: event.pointerId,
          startX: event.clientX,
          startY: event.clientY,
          dx: prefs.dx,
          dy: prefs.dy,
          moved: false,
          rect: root.getBoundingClientRect(),
          startOffsetX: prefs.dx,
          startOffsetY: prefs.dy,
        };
        try {
          event.currentTarget.setPointerCapture(event.pointerId);
        } catch {
          /* pointer capture is best effort */
        }
        setDragging(true);
      };

      const onPointerMove = (event) => {
        const drag = dragRef.current;
        if (!drag || drag.pointerId !== event.pointerId) return;
        const dx = drag.startX === undefined ? 0 : event.clientX - drag.startX;
        const dy = drag.startY === undefined ? 0 : event.clientY - drag.startY;
        if (!drag.moved && Math.abs(dx) + Math.abs(dy) > 4) drag.moved = true;
        setLive({ dx, dy });
      };

      const finishPointer = (event, commit) => {
        const drag = dragRef.current;
        if (!drag || drag.pointerId !== event.pointerId) return;
        dragRef.current = null;
        setDragging(false);
        if (drag.moved) {
          if (commit) updatePrefs({ dx: drag.startOffsetX + live.dx, dy: drag.startOffsetY + live.dy });
          setLive({ dx: 0, dy: 0 });
          return;
        }
        setLive({ dx: 0, dy: 0 });
        if (commit) setAnim(pick(CLICK, animRef.current));
      };

      const onDoubleClick = () => {
        if (!prefs.memes) return;
        setMeme((current) => pick(MEMES, current));
      };

      const cornerClass = prefs.corner;
      const transform = `translate(${prefs.dx + live.dx}px, ${prefs.dy + live.dy}px)`;

      return h('div', {
        ref: rootRef,
        className: 'llp-root',
        'data-corner': cornerClass,
        style: {
          '--llp-size': `${prefs.size}px`,
          transform,
        },
      }, [
        meme === null ? null : h('div', { key: 'bubble', className: 'llp-bubble' },
          h('img', { src: `${ROUTE}/memes/${encodeURIComponent(meme)}.png`, alt: meme, draggable: false })),
        h('div', { key: 'stage', className: 'llp-stage' }, [
          h('video', {
            key: 'video',
            ref: videoRef,
            className: 'llp-video',
            muted: true,
            playsInline: true,
            autoPlay: true,
            preload: 'auto',
            onEnded: next,
            'aria-hidden': true,
          }),
          h('div', {
            key: 'hit',
            className: `llp-hit${dragging ? ' llp-dragging' : ''}`,
            title: '噜噜',
            onPointerDown,
            onPointerMove,
            onPointerUp: (event) => finishPointer(event, true),
            onPointerCancel: (event) => finishPointer(event, false),
            onDoubleClick,
          }),
        ]),
      ]);
    }

    function SettingsSection() {
      const prefs = usePrefs();
      const { t } = React.useContext(SettingsContext);
      return h('div', { className: 'llp-settings' }, [
        h('div', { className: 'llp-row', key: 'enabled' }, [
          h('span', { key: 'label' }, t('settings.enabled')),
          h('input', {
            key: 'input',
            type: 'checkbox',
            checked: prefs.enabled,
            onChange: (event) => updatePrefs({ enabled: event.target.checked }),
          }),
        ]),
        h('div', { className: 'llp-row', key: 'size' }, [
          h('span', { key: 'label' }, t('settings.size')),
          h('input', {
            key: 'input',
            type: 'range',
            min: 300,
            max: 640,
            step: 2,
            value: prefs.size,
            onChange: (event) => updatePrefs({ size: Number(event.target.value) }),
          }),
          h('span', { key: 'value' }, `${prefs.size}px`),
        ]),
        h('div', { className: 'llp-row', key: 'corner' }, [
          h('span', { key: 'label' }, t('settings.corner')),
          h('select', {
            key: 'input',
            value: prefs.corner,
            onChange: (event) => updatePrefs({ corner: event.target.value, dx: 0, dy: 0 }),
          }, CORNERS.map((corner) => h('option', { key: corner, value: corner }, t(`corner.${corner}`)))),
        ]),
        h('div', { className: 'llp-row', key: 'memes' }, [
          h('span', { key: 'label' }, t('settings.memes')),
          h('input', {
            key: 'input',
            type: 'checkbox',
            checked: prefs.memes,
            onChange: (event) => updatePrefs({ memes: event.target.checked }),
          }),
        ]),
        h('div', { className: 'llp-row', key: 'reset' }, [
          h('span', { key: 'label' }, ''),
          h('button', { key: 'button', type: 'button', onClick: () => updatePrefs({ dx: 0, dy: 0 }) }, t('settings.reset')),
        ]),
        h('p', { className: 'llp-note', key: 'note' }, t('settings.note')),
      ]);
    }

    const SettingsContext = React.createContext({ t: (key) => key });

    return {
      inject: ['slots', 'locale'],
      apply(ctx) {
        ctx.effect(() => ctx.locale.register(NS, DICT), 'dsh-lulu-pet: dictionaries');
        const t = ctx.locale.bind(NS);
        const cleanupCss = ctx.effect(() => injectCss(), 'dsh-lulu-pet: styles');

        ctx.slots.inject('shell.overlay', function* () {
          yield ctx.slots.register({
            name: 'shell.overlay',
            id: 'lulu-pet',
            order: 950,
          }, PetOverlay);
        });

        ctx.slots.inject('settings.section', function* () {
          yield ctx.slots.register({
            name: 'settings.section',
            id: 'lulu-pet',
            order: 40,
            label: () => t('nav'),
            inject: () => ({ t }),
          }, () => h(SettingsContext.Provider, { value: { t } }, h(SettingsSection, {})));
        });

        return cleanupCss;
      },
    };
  },
});
