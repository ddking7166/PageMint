import type { Child } from 'hono/jsx'

export interface LayoutProps {
  title: string
  children: Child
}

export function Layout({ title, children }: LayoutProps) {
  return (
    <html lang="zh-CN">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{title}</title>
        <script type="module" src="/static/actions.js"></script>
        <style>{`
          :root {
            color-scheme: light;
            font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            --bg: #f7f8fb;
            --surface: #ffffff;
            --surface-2: #edf2f7;
            --ink: #172033;
            --muted: #5d6c82;
            --line: #d8dee8;
            --teal: #0f766e;
            --teal-2: #d8f3ef;
            --blue: #1d4ed8;
            --blue-2: #dfe9ff;
            --amber: #b45309;
            --amber-2: #fff0d2;
            --code: #111827;
          }
          * { box-sizing: border-box; }
          html { scroll-behavior: smooth; }
          body { margin: 0; background: var(--bg); color: var(--ink); line-height: 1.58; }
          a { color: var(--blue); text-decoration: none; }
          a:hover { text-decoration: underline; }
          main { min-height: 100vh; }
          h1, h2, h3, p { margin-top: 0; }
          h1 {
            max-width: 820px;
            margin-bottom: 20px;
            font-size: 66px;
            line-height: 1;
            letter-spacing: 0;
          }
          h2 { margin-bottom: 14px; font-size: 34px; line-height: 1.16; letter-spacing: 0; }
          h3 { margin-bottom: 8px; font-size: 17px; letter-spacing: 0; }
          .site-nav {
            position: sticky;
            top: 0;
            z-index: 10;
            display: grid;
            grid-template-columns: auto minmax(0, 1fr) auto;
            align-items: center;
            gap: 22px;
            width: 100%;
            border-bottom: 1px solid rgba(216, 222, 232, .9);
            background: rgba(247, 248, 251, .94);
            backdrop-filter: blur(10px);
            padding: 12px max(20px, calc((100vw - 1180px) / 2));
          }
          .brand {
            display: inline-flex;
            align-items: center;
            gap: 10px;
            color: var(--ink);
            font-weight: 800;
            letter-spacing: 0;
          }
          .brand-mark {
            display: inline-grid;
            place-items: center;
            width: 32px;
            height: 32px;
            border-radius: 8px;
            background: var(--ink);
            color: #fff;
            font-size: 12px;
            font-weight: 800;
          }
          .nav-links {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 18px;
            min-width: 0;
            font-size: 14px;
            white-space: nowrap;
          }
          .nav-links a { color: #314056; }
          .nav-cta, .link-button, .button {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            min-height: 40px;
            border-radius: 7px;
            padding: 9px 14px;
            font-weight: 720;
          }
          .nav-cta {
            border: 1px solid var(--line);
            background: #fff;
            color: var(--ink);
          }
          .section {
            width: 100%;
            padding: 58px max(20px, calc((100vw - 1180px) / 2));
          }
          .section + .section { border-top: 1px solid var(--line); }
          .hero-shell {
            border-bottom: 1px solid var(--line);
            background: #f3f6fa;
          }
          .hero {
            display: grid;
            grid-template-columns: minmax(0, 1fr) minmax(390px, .86fr);
            gap: 44px;
            align-items: center;
            padding-top: 76px;
            padding-bottom: 64px;
          }
          .hero-copy { min-width: 0; }
          .eyebrow {
            color: var(--teal);
            font-size: 13px;
            font-weight: 760;
            letter-spacing: 0;
          }
          .lead { max-width: 720px; color: var(--muted); font-size: 20px; }
          .muted { color: var(--muted); }
          .actions { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 28px; }
          .button {
            border: 1px solid var(--teal);
            background: var(--teal);
            color: #fff;
            cursor: pointer;
          }
          .button:hover { background: #115e59; }
          .link-button {
            border: 1px solid var(--line);
            background: #fff;
            color: var(--ink);
          }
          .primary-link {
            border-color: var(--ink);
            background: var(--ink);
            color: #fff;
          }
          .metric-row {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 12px;
            margin-top: 32px;
            max-width: 660px;
          }
          .metric {
            border: 1px solid var(--line);
            border-radius: 8px;
            background: rgba(255, 255, 255, .78);
            padding: 14px;
          }
          .metric strong { display: block; font-size: 24px; line-height: 1; }
          .metric span { display: block; margin-top: 6px; color: var(--muted); font-size: 13px; }
          .product-visual {
            overflow: hidden;
            border: 1px solid #ccd6e3;
            border-radius: 8px;
            background: #fff;
            box-shadow: 0 20px 48px rgba(15, 23, 42, .14);
          }
          .visual-topbar, .terminal-head {
            display: flex;
            align-items: center;
            gap: 7px;
            border-bottom: 1px solid #263244;
            padding: 10px 14px;
            color: #9ca3af;
            font-size: 13px;
          }
          .visual-topbar {
            border-color: var(--line);
            color: #4b5b70;
            background: #f8fafc;
          }
          .dot { width: 10px; height: 10px; border-radius: 999px; background: #64748b; }
          .dot:nth-child(1) { background: #ef4444; }
          .dot:nth-child(2) { background: #f59e0b; }
          .dot:nth-child(3) { background: #22c55e; margin-right: 8px; }
          .pipeline {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 12px;
            padding: 18px;
          }
          .pipeline-card {
            min-height: 118px;
            border: 1px solid var(--line);
            border-radius: 8px;
            padding: 14px;
            background: #fff;
          }
          .pipeline-card span {
            display: inline-block;
            margin-bottom: 14px;
            color: var(--muted);
            font-size: 12px;
            font-weight: 760;
          }
          .pipeline-card strong { display: block; margin-bottom: 4px; }
          .pipeline-card p { margin-bottom: 0; color: var(--muted); font-size: 13px; }
          .accent-teal { border-top: 4px solid var(--teal); }
          .accent-blue { border-top: 4px solid var(--blue); }
          .accent-amber { border-top: 4px solid var(--amber); }
          .accent-ink { border-top: 4px solid var(--ink); }
          .visual-code {
            border-top: 1px solid var(--line);
            background: #f8fafc;
            color: var(--ink);
          }
          .terminal {
            overflow: hidden;
            border: 1px solid #263244;
            border-radius: 8px;
            background: var(--code);
            box-shadow: 0 18px 44px rgba(15, 23, 42, .16);
          }
          .terminal-head { background: #151f2e; }
          pre {
            margin: 0;
            overflow: auto;
            padding: 18px;
            color: #e5e7eb;
            font-size: 13px;
            line-height: 1.65;
            tab-size: 2;
          }
          code { font-family: "SFMono-Regular", Consolas, "Liberation Mono", monospace; }
          :not(pre) > code { background: #edf2f7; border-radius: 4px; padding: 2px 5px; color: #243044; }
          .section-heading {
            max-width: 820px;
            margin-bottom: 28px;
          }
          .section-heading p { color: var(--muted); }
          .band { background: #fff; }
          .grid { display: grid; gap: 16px; }
          .grid.cols-4 { grid-template-columns: repeat(4, minmax(0, 1fr)); }
          .grid.cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
          .grid.cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .card, .feature-card, .api-card {
            min-width: 0;
            border: 1px solid var(--line);
            border-radius: 8px;
            background: var(--surface);
            padding: 20px;
          }
          .feature-card {
            min-height: 178px;
            border-top: 4px solid var(--teal);
          }
          .feature-card:nth-child(2n) { border-top-color: var(--blue); }
          .feature-card:nth-child(3n) { border-top-color: var(--amber); }
          .card p, .feature-card p, .api-card p { margin-bottom: 0; color: var(--muted); }
          .split {
            display: grid;
            grid-template-columns: minmax(0, .9fr) minmax(0, 1.1fr);
            gap: 28px;
            align-items: start;
          }
          .wide-terminal { max-width: 760px; }
          .api-reference { background: #f7f8fb; }
          .api-group-list { display: grid; gap: 18px; }
          .api-group {
            display: grid;
            grid-template-columns: minmax(220px, .32fr) minmax(0, 1fr);
            gap: 18px;
            align-items: start;
            border: 1px solid var(--line);
            border-radius: 8px;
            background: #fff;
            padding: 18px;
          }
          .api-group-copy {
            position: sticky;
            top: 82px;
          }
          .api-group-copy p { color: var(--muted); margin-bottom: 0; }
          .api-list {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 12px;
          }
          .api-card { padding: 16px; background: #fbfcfe; }
          .api-card-head {
            display: grid;
            gap: 8px;
            margin-bottom: 10px;
          }
          .api-card-head strong { color: var(--ink); }
          .api-card-head code {
            overflow-wrap: anywhere;
            background: #eef3f7;
            color: #263244;
          }
          .api-benefit {
            margin-top: 12px;
            border-left: 3px solid var(--teal);
            background: var(--teal-2);
            border-radius: 0 6px 6px 0;
            padding: 9px 10px;
            color: #164e45;
            font-size: 13px;
          }
          .flow {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 12px;
            margin-top: 18px;
          }
          .step {
            border: 1px solid var(--line);
            border-left: 4px solid var(--teal);
            border-radius: 8px;
            background: #fff;
            padding: 16px;
            min-height: 126px;
          }
          .step:nth-child(2n) { border-left-color: var(--blue); }
          .step:nth-child(3n) { border-left-color: var(--amber); }
          .step strong { display: block; margin-bottom: 6px; }
          .package-card { padding-top: 4px; padding-bottom: 4px; }
          .package {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 14px;
            border-bottom: 1px solid var(--line);
            padding: 14px 0;
          }
          .package:first-child { padding-top: 0; }
          .package:last-child { border-bottom: 0; padding-bottom: 0; }
          .package strong { display: block; }
          .tag {
            flex: 0 0 auto;
            border-radius: 999px;
            background: var(--surface-2);
            color: #344256;
            padding: 3px 8px;
            font-size: 12px;
          }
          .fit-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin-top: 18px; }
          .list { margin: 12px 0 0; padding-left: 20px; }
          .list li + li { margin-top: 8px; }
          .good { color: var(--teal); font-weight: 760; }
          .bad { color: var(--amber); font-weight: 760; }
          footer {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
            border-top: 1px solid var(--line);
            padding: 28px max(20px, calc((100vw - 1180px) / 2));
            color: var(--muted);
            background: #fff;
          }
          footer strong { color: var(--ink); }
          @media (max-width: 1080px) {
            .site-nav { grid-template-columns: 1fr auto; }
            .nav-links { grid-column: 1 / -1; justify-content: flex-start; flex-wrap: wrap; white-space: normal; }
            .hero, .split, .api-group { grid-template-columns: 1fr; }
            .api-group-copy { position: static; }
            .grid.cols-4 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          }
          @media (max-width: 720px) {
            h1 { font-size: 42px; }
            h2 { font-size: 28px; }
            .section { padding-top: 38px; padding-bottom: 38px; }
            .hero { padding-top: 44px; padding-bottom: 42px; }
            .metric-row, .pipeline, .grid.cols-4, .grid.cols-3, .grid.cols-2, .api-list, .flow, .fit-grid {
              grid-template-columns: 1fr;
            }
            .nav-cta { width: 100%; }
          }
        `}</style>
      </head>
      <body>{children}</body>
    </html>
  )
}
