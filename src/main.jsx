import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import ThreeSphere from './ThreeSphere.jsx'
import './style.css'

const textRevealEnabled = 'IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches
if (textRevealEnabled) document.documentElement.classList.add('reveal-ready')

const tg = 'https://t.me/deniszyuban'
const vk = 'https://vk.ru/deniszyuban'

function RevealLine({ children }) {
  return <span className="reveal-line"><span className="reveal-line-inner">{children}</span></span>
}

function Icon({ type }) {
  if (type === 'tg') return <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="m20.7 4.2-3.2 15.1c-.24 1.07-.87 1.33-1.76.83l-4.86-3.58-2.35 2.26c-.26.26-.48.48-.99.48l.35-4.93 8.97-8.1c.39-.35-.08-.55-.6-.2L5.17 13.03.4 11.54c-1.04-.32-1.06-1.04.22-1.54L19.25 2.8c.87-.32 1.63.2 1.45 1.4Z"/></svg>
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12.94 17.35C5.88 17.35 1.86 12.52 1.7 4.5h3.54c.12 5.88 2.7 8.37 4.74 8.88V4.5h3.33v5.07c2.01-.22 4.12-2.53 4.83-5.07h3.33a9.82 9.82 0 0 1-4.46 6.42 10.15 10.15 0 0 1 5.27 6.43h-3.67c-.78-2.43-2.73-4.32-5.3-4.58v4.58h-.37Z"/></svg>
}

function Socials({ large = false }) {
  return <div className={`flex items-center ${large ? 'gap-3' : 'gap-2.5'}`} aria-label="Социальные сети">
    <a className={`social-link ${large ? 'social-link-large' : ''}`} href={vk} target="_blank" rel="noopener noreferrer" aria-label="ВКонтакте Дениса Зюбана"><Icon type="vk" /><span className="sr-only">ВКонтакте</span></a>
    <a className={`social-link ${large ? 'social-link-large' : ''}`} href={tg} target="_blank" rel="noopener noreferrer" aria-label="Телеграм Дениса Зюбана"><Icon type="tg" /><span className="sr-only">Телеграм</span></a>
  </div>
}

const initialCode = {
  html: `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8" />
  <title>Сайт для вашей идеи</title>
  <link rel="stylesheet" href="style.css" />
</head>
<body>
  <main class="experience">
    <h1>Сайт, который хочется открыть.</h1>
    <p>Придумаем и сделаем вместе.</p>
  </main>
</body>
</html>`,
  css: `:root {
  --canvas: #08090b;
  --ink: #f3f2ee;
  --accent: #b9c5ae;
}

.experience {
  min-height: 100vh;
  display: grid;
  place-content: center;
  background: var(--canvas);
  color: var(--ink);
}
/* Здесь всё на своём месте. */`,
}

function highlightLine(line, language) {
  const pattern = language === 'html'
    ? /<!--.*?-->|<\/?[!]?[A-Za-z][\w-]*|\/?>|"[^"]*"|'[^']*'|[A-Za-z_:][\w:.-]*/g
    : /\/\*.*?\*\/|#[\da-fA-F]+|[.#:]?[A-Za-z_-][\w-]*|\d+(?:\.\d+)?(?:px|vh|rem|%)?/g
  const pieces = []
  let previousEnd = 0
  for (const match of line.matchAll(pattern)) {
    const part = match[0]
    const start = match.index
    if (start > previousEnd) pieces.push(line.slice(previousEnd, start))
    const rest = line.slice(start + part.length).trimStart()
    let className = ''
    if (part.startsWith('<!--') || part.startsWith('/*')) className = 'code-comment'
    else if (/^["']/.test(part) || /^#[\da-fA-F]+$/.test(part)) className = 'code-lime'
    else if (language === 'html' && (part.startsWith('<') || part === '>' || part === '/>')) className = 'code-purple'
    else if (language === 'html' && rest.startsWith('=')) className = 'code-sky'
    else if (language === 'css' && line.trim().endsWith('{') && line.trim().startsWith(part)) className = 'code-purple'
    else if (language === 'css' && rest.startsWith(':')) className = 'code-sky'
    else if (language === 'css' && part.startsWith('--')) className = 'code-lime'
    else if (language === 'css' && /^\d/.test(part)) className = 'code-orange'
    pieces.push(className ? <span className={className} key={start}>{part}</span> : part)
    previousEnd = start + part.length
  }
  if (previousEnd < line.length) pieces.push(line.slice(previousEnd))
  return pieces
}

function CodeWindow({ visible, panelRef }) {
  const [tab, setTab] = useState('html')
  const [code, setCode] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('denis-code-demo'))
      return saved && typeof saved.html === 'string' && typeof saved.css === 'string' ? saved : initialCode
    } catch { return initialCode }
  })
  const highlightRef = useRef(null)
  const numbersRef = useRef(null)
  const lines = code[tab].split('\n')
  const edited = code[tab] !== initialCode[tab]
  useEffect(() => {
    try { localStorage.setItem('denis-code-demo', JSON.stringify(code)) } catch { /* Storage may be unavailable. */ }
  }, [code])
  useEffect(() => {
    if (highlightRef.current) highlightRef.current.scrollTo(0, 0)
    if (numbersRef.current) numbersRef.current.scrollTop = 0
  }, [tab])
  const syncScroll = event => {
    if (highlightRef.current) {
      highlightRef.current.scrollTop = event.currentTarget.scrollTop
      highlightRef.current.scrollLeft = event.currentTarget.scrollLeft
    }
    if (numbersRef.current) numbersRef.current.scrollTop = event.currentTarget.scrollTop
  }
  const indentWithTab = event => {
    if (event.key !== 'Tab') return
    event.preventDefault()
    const input = event.currentTarget
    const start = input.selectionStart
    const end = input.selectionEnd
    setCode(previous => ({ ...previous, [tab]: `${previous[tab].slice(0, start)}  ${previous[tab].slice(end)}` }))
    requestAnimationFrame(() => { input.selectionStart = input.selectionEnd = start + 2 })
  }
  return <div ref={panelRef} className={`code-window ${visible ? 'code-visible' : ''}`} aria-label="Пример кода HTML и CSS">
    <div className="code-toolbar">
      <div className="window-dots"><i /><i /><i /></div>
      <div className="code-tabs">
        <button className={tab === 'html' ? 'selected' : ''} onClick={() => setTab('html')}><span className="tab-icon html-icon">◇</span> index.html</button>
        <button className={tab === 'css' ? 'selected' : ''} onClick={() => setTab('css')}><span className="tab-icon css-icon">✳</span> style.css</button>
      </div>
      <span className="toolbar-end">● ● ●</span>
    </div>
    <div className="code-body">
      <div className="editor-line-numbers" ref={numbersRef} aria-hidden="true">{lines.map((_, i) => <div key={i}>{String(i + 1).padStart(2, '0')}</div>)}</div>
      <pre className="editor-highlight" ref={highlightRef} aria-hidden="true">{lines.map((line, i) => <React.Fragment key={i}>{highlightLine(line, tab)}{i < lines.length - 1 ? '\n' : null}</React.Fragment>)}</pre>
      <textarea className="code-editor" key={tab} value={code[tab]} onChange={event => setCode(previous => ({ ...previous, [tab]: event.target.value }))} onKeyDown={indentWithTab} onScroll={syncScroll} aria-label={`Редактировать ${tab === 'html' ? 'HTML' : 'CSS'} код`} autoCapitalize="off" autoComplete="off" spellCheck={false} wrap="off" />
    </div>
    <div className="code-status"><span><i /> {edited ? 'Изменено вами' : 'Можно редактировать'}</span><span>UTF-8 <b>·</b> {tab === 'html' ? 'HTML' : 'CSS'}</span></div>
  </div>
}

function HeroScene({ onDone }) {
  const [phase, setPhase] = useState('flight')
  const [visible, setVisible] = useState(false)
  const panelRef = useRef(null)
  const frameRef = useRef(null)
  const reducedMotion = useRef(window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  useEffect(() => {
    if (reducedMotion.current) { setPhase('done'); setVisible(true); onDone() }
  }, [onDone])
  const finish = useCallback(() => { setPhase('done'); onDone() }, [onDone])
  return <div className={`hero-scene phase-${phase}`}>
    <div className="scene-halo" />
    <div className={`code-glow ${visible ? 'code-glow-visible' : ''}`} aria-hidden="true" />
    {phase !== 'done' && !reducedMotion.current && <ThreeSphere panelRef={panelRef} frameRef={frameRef} onReveal={() => setVisible(true)} onDone={finish} />}
    <CodeWindow panelRef={panelRef} visible={visible} />
    <div ref={frameRef} className={`code-frame ${visible ? 'code-frame-visible' : ''}`} aria-hidden="true" />
    <div className="scene-floor" />
  </div>
}

function CustomCursor() {
  const ringRef = useRef(null)
  const pointRef = useRef(null)
  useEffect(() => {
    const precisePointer = window.matchMedia('(hover: hover) and (pointer: fine)')
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (!precisePointer.matches || reducedMotion.matches) return
    const root = document.documentElement
    root.classList.add('custom-cursor-enabled')
    let targetX = -100, targetY = -100, ringX = -100, ringY = -100, frame = 0
    const animate = () => {
      ringX += (targetX - ringX) * .23
      ringY += (targetY - ringY) * .23
      if (ringRef.current) ringRef.current.style.transform = `translate3d(${ringX}px, ${ringY}px, 0) translate(-50%, -50%)`
      if (Math.abs(targetX - ringX) + Math.abs(targetY - ringY) > .3) frame = requestAnimationFrame(animate)
      else frame = 0
    }
    const move = event => {
      targetX = event.clientX
      targetY = event.clientY
      if (pointRef.current) pointRef.current.style.transform = `translate3d(${targetX}px, ${targetY}px, 0) translate(-50%, -50%)`
      const overText = Boolean(event.target.closest('textarea, input, [contenteditable="true"]'))
      root.classList.toggle('cursor-over-text', overText)
      root.classList.toggle('cursor-over-link', Boolean(event.target.closest('a, button')))
      root.classList.add('cursor-present')
      if (!frame) frame = requestAnimationFrame(animate)
    }
    const leave = () => root.classList.remove('cursor-present')
    const down = () => root.classList.add('cursor-pressed')
    const up = () => root.classList.remove('cursor-pressed')
    window.addEventListener('pointermove', move, { passive: true })
    document.addEventListener('pointerleave', leave)
    window.addEventListener('pointerdown', down)
    window.addEventListener('pointerup', up)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('pointermove', move)
      document.removeEventListener('pointerleave', leave)
      window.removeEventListener('pointerdown', down)
      window.removeEventListener('pointerup', up)
      root.classList.remove('custom-cursor-enabled', 'cursor-present', 'cursor-over-link', 'cursor-over-text', 'cursor-pressed')
    }
  }, [])
  return <div className="cursor-layer" aria-hidden="true"><span className="cursor-ring" ref={ringRef} /><span className="cursor-point" ref={pointRef} /></div>
}

function App() {
  const [introDone, setIntroDone] = useState(false)
  const finishIntro = useCallback(() => setIntroDone(true), [])
  useLayoutEffect(() => {
    if (!textRevealEnabled) return
    const elements = document.querySelectorAll(`
      main section:not(.hero) .section-index,
      .about-lead .outline-number, .about-lead > span, .prose-stack > p,
      .experience-row .year, .experience-row h3, .experience-row p, .experience-row .row-symbol,
      .service-grid .service-num, .service-grid h3, .service-grid p,
      .approach-intro, .approach-steps > div > span, .approach-steps h3, .approach-steps p,
      .contact-layout p, .contact-links a,
      .footer-brand, .footer-note, .footer [aria-label="Социальные сети"]
    `)
    elements.forEach(element => element.classList.add('element-reveal'))
    const targets = document.querySelectorAll('.text-reveal, .element-reveal')
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue
        entry.target.classList.add('is-visible')
        observer.unobserve(entry.target)
      }
    }, { rootMargin: '0px 0px -5% 0px', threshold: 0.08 })
    targets.forEach(target => observer.observe(target))
    return () => observer.disconnect()
  }, [])
  useEffect(() => {
    const editorIsActive = () => document.activeElement?.classList?.contains('code-editor')
    const restrictSelection = event => {
      if (!(event.target instanceof Element && event.target.closest('.code-editor'))) event.preventDefault()
    }
    const restrictSelectAll = event => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'a' && !editorIsActive()) event.preventDefault()
    }
    document.addEventListener('selectstart', restrictSelection)
    document.addEventListener('keydown', restrictSelectAll)
    return () => {
      document.removeEventListener('selectstart', restrictSelection)
      document.removeEventListener('keydown', restrictSelectAll)
    }
  }, [])
  useEffect(() => {
    document.body.style.overflow = ''
    if (introDone) return
    const stopScroll = event => {
      if (event.target instanceof Element && event.target.closest('.code-window')) return
      event.preventDefault()
    }
    const stopScrollKeys = event => {
      if (event.target instanceof Element && event.target.closest('textarea, input, [contenteditable="true"]')) return
      if (['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', ' '].includes(event.key)) event.preventDefault()
    }
    window.addEventListener('wheel', stopScroll, { passive: false })
    window.addEventListener('touchmove', stopScroll, { passive: false })
    window.addEventListener('keydown', stopScrollKeys)
    return () => {
      window.removeEventListener('wheel', stopScroll)
      window.removeEventListener('touchmove', stopScroll)
      window.removeEventListener('keydown', stopScrollKeys)
    }
  }, [introDone])
  return <div className="site-shell">
    <CustomCursor />
    <div className="site-header-frame fixed inset-x-0 top-0 z-50 bg-[#08090b]">
      <header className="site-header mx-auto grid w-full max-w-[1440px] grid-cols-[1fr_auto] items-center px-6 md:px-10 lg:grid-cols-[1fr_auto_1fr] xl:px-16">
        <a className="brand" href="#top" aria-label="Денис Зюбан — на главную"><span className="brand-mark">D<span>∕</span>Z</span><span className="brand-text">Денис Зюбан<small>веб-разработчик</small></span></a>
        <nav className="hidden items-center justify-self-center gap-8 lg:flex" aria-label="Основная навигация"><a href="#about">Обо мне</a><a href="#services">Услуги</a><a href="#approach">Подход</a><a href="#contacts">Контакты</a></nav>
        <div className="justify-self-end"><Socials /></div>
      </header>
    </div>
    <div className="site-header-spacer" aria-hidden="true" />

    <main id="top">
      <section className="hero relative mx-auto max-w-[1440px] px-6 md:px-10 xl:px-16" aria-labelledby="hero-heading">
        <div className="hero-copy text-center">
          <div className="eyebrow"><span className="availability-dot" /> Беру новые проекты <span className="eyebrow-divider">/</span> 2026</div>
          <h1 id="hero-heading">Сайт, который<br /><em>говорит за вас.</em></h1>
          <p>Привет, я Денис. Делаю сайты, на которых сразу понятно, чем вы занимаетесь и почему к вам стоит обратиться.</p>
        </div>
        <HeroScene onDone={finishIntro} />
        <div className="hero-bottom"><span>От первого разговора до готового сайта</span><a href="#about">Узнать обо мне <span>↓</span></a></div>
      </section>

      <section id="about" className="section-divider about-section mx-auto max-w-[1440px] px-6 py-24 md:px-10 md:py-32 xl:px-16">
        <div className="section-heading"><span className="section-index">01 / Обо мне</span><h2 className="text-reveal"><RevealLine>Сначала вникаю в задачу.</RevealLine><RevealLine><span>Потом собираю сайт.</span></RevealLine></h2></div>
        <div className="about-grid"><div className="about-lead"><svg className="outline-number" viewBox="0 0 370 280" role="img" aria-label="19 лет"><text x="4" y="222">19</text></svg><span>лет / учусь на практике<br />и люблю своё дело</span></div><div className="prose-stack"><p className="lead-text">Мне нравится превращать разговоры, заметки и разрозненные идеи в сайт, на котором всё понятно и удобно.</p><p>Я начал с HTML и CSS: хотелось разобраться, как устроены сайты, которыми пользуюсь сам. Потом освоил JavaScript и адаптивную вёрстку. Сейчас мне 19, я работаю над реальными задачами — от личных страниц до сайтов для услуг и небольшого бизнеса.</p><p>Мне важно, чтобы на сайте всё было на своём месте. Я продумываю структуру, пишу код и проверяю детали интерфейса, пока результат не станет удобным и цельным.</p><p>Я смотрю на сайт глазами человека, который откроет его впервые. Понятно ли ему, куда он попал? Легко ли найти нужное с телефона? Быстро ли всё загрузится? Из таких мелочей и складывается хороший результат.</p></div></div>
      </section>

      <section className="experience-section bg-[#101114] py-24 md:py-32"><div className="mx-auto max-w-[1440px] px-6 md:px-10 xl:px-16"><div className="section-heading"><span className="section-index">02 / Путь</span><h2 className="text-reveal"><RevealLine>Учился делать сайты.</RevealLine><RevealLine><span>Теперь делаю их для людей.</span></RevealLine></h2></div><div className="experience-list">
        <div className="experience-row"><span className="year">2024</span><div><h3>Разобрался с основами</h3><p>Изучал HTML и CSS, собирал первые страницы и учился делать их удобными на разных экранах. Пробовал разные сетки и внимательно смотрел, как дизайн ведёт себя в браузере.</p></div><span className="row-symbol">↗</span></div>
        <div className="experience-row"><span className="year">2025</span><div><h3>Перешёл к настоящим задачам</h3><p>Стал делать сайты для знакомых и небольших команд. Появились задачи посложнее: продумать структуру, собрать несколько страниц, добавить формы и проверить, что всё работает.</p></div><span className="row-symbol">↗</span></div>
        <div className="experience-row"><span className="year">2026</span><div><h3>Делаю сайты на заказ</h3><p>Работаю с React и продолжаю углубляться во фронтенд. Слежу за тем, чтобы сайт быстро открывался, хорошо выглядел на телефоне и был удобен вам после запуска.</p></div><span className="row-symbol">↗</span></div>
      </div></div></section>

      <section id="services" className="services-section mx-auto max-w-[1440px] px-6 py-24 md:px-10 md:py-32 xl:px-16"><div className="section-heading"><span className="section-index">03 / Что я делаю</span><h2 className="text-reveal"><RevealLine>Какой сайт</RevealLine><RevealLine><span>вам нужен?</span></RevealLine></h2></div><div className="service-grid"><article><span className="service-num">01</span><h3>Сайт-визитка</h3><p>Если нужно коротко и ясно рассказать о себе или своём деле. Покажем услуги, ответим на главные вопросы и оставим удобный способ связаться.</p></article><article><span className="service-num">02</span><h3>Лендинг</h3><p>Одна страница для продукта, услуги или события. Проведём человека от первого знакомства до заявки без лишних отвлечений.</p></article><article><span className="service-num">03</span><h3>Обновление сайта</h3><p>Если старый сайт уже не отражает ваше дело или им неудобно пользоваться, пересмотрю структуру и дизайн, а заодно приведу в порядок мобильную версию.</p></article><article><span className="service-num">04</span><h3>Сайт с личным кабинетом</h3><p>Нужны регистрация, личные кабинеты или чаты? Сделаю сайт, где пользователи смогут входить в аккаунт, управлять своими данными и общаться друг с другом.</p></article></div></section>

      <section id="approach" className="approach-section bg-[#111519] text-[#f1f2ef]"><div className="mx-auto grid max-w-[1440px] gap-14 px-6 py-24 md:px-10 md:py-32 lg:grid-cols-[.9fr_1.1fr] xl:px-16"><div><span className="section-index">04 / Как работаю</span><h2 className="text-reveal"><RevealLine>Начнём</RevealLine><RevealLine>с простого</RevealLine><RevealLine><i>разговора.</i></RevealLine></h2><p className="approach-intro">Расскажите, чем вы занимаетесь и чего ждёте от сайта. Я помогу разобраться, что показать в первую очередь и как сделать это понятным для ваших клиентов.</p></div><div className="approach-steps"><div><span>01</span><div><h3>Знакомимся</h3><p>Обсудим вашу задачу, будущих посетителей и примеры сайтов, которые вам нравятся. Выясним, без чего точно не обойтись.</p></div></div><div><span>02</span><div><h3>Продумываю структуру и дизайн</h3><p>Намечу страницы и покажу, как будет выглядеть сайт. Вы сможете оценить направление до того, как начнётся разработка.</p></div></div><div><span>03</span><div><h3>Собираю и проверяю</h3><p>Сверстаю сайт для телефона и компьютера, добавлю нужные функции и проверю, что всё работает как задумано.</p></div></div><div><span>04</span><div><h3>Запускаем</h3><p>Помогу опубликовать сайт и вместе с вами пройду по нему ещё раз. Покажу, что где находится и как им пользоваться.</p></div></div></div></div></section>

      <section id="contacts" className="contact-section mx-auto max-w-[1440px] px-6 py-24 md:px-10 md:py-32 xl:px-16"><span className="section-index">05 / Контакты</span><div className="contact-layout"><div><h2 className="text-reveal"><RevealLine>Есть идея?</RevealLine><RevealLine><span>Напишите мне.</span></RevealLine></h2><p>Опишите задачу как получится — даже если пока нет чёткого плана. Обсудим её и поймём, с чего начать.</p></div><div className="contact-links"><a href={tg} target="_blank" rel="noopener noreferrer"><span>Telegram</span><span>@deniszyuban ↗</span></a><a href={vk} target="_blank" rel="noopener noreferrer"><span>ВКонтакте</span><span>deniszyuban ↗</span></a></div></div></section>
    </main>
    <footer className="footer"><div className="mx-auto flex max-w-[1440px] flex-col gap-8 px-6 py-8 md:flex-row md:items-center md:justify-between md:px-10 xl:px-16"><div className="footer-brand">Денис Зюбан <span>© 2026</span></div><span className="footer-note">Спасибо, что заглянули.</span><Socials large /></div></footer>
  </div>
}

createRoot(document.getElementById('root')).render(<App />)

