import {
  ArrowRight,
  Fingerprint,
  KeyRound,
  Laptop,
  Layers,
  Lock,
  ScrollText,
  ShieldCheck,
  TerminalSquare,
  UserCog,
  Users,
  Wrench,
  Zap,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { CodeBlock } from '../components/CodeBlock';
import { PUBLIC_HOST } from '../lib/constants';

const SAMPLE_HANDLE = 'alex';

export function Landing() {
  return (
    <>
      <Hero />
      <Security />
      <HowItWorks />
      <UseCases />
      <UnderTheHood />
      <FinalCta />
    </>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="container-page grid items-center gap-12 pt-16 pb-12 lg:grid-cols-2 lg:pt-24">
        <div className="animate-fade-up">
          <span className="inline-flex items-center gap-2 rounded-full border border-ink-700 bg-ink-900/70 px-3 py-1 text-xs font-medium text-accent-400">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-pulse-ring rounded-full bg-accent-400" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-accent-500" />
            </span>
            Open-source · Passkeys for SSH
          </span>

          <h1 className="mt-6 text-4xl font-extrabold leading-[1.05] tracking-tight text-white sm:text-6xl">
            Fetch all your public keys with a single{' '}
            <span className="bg-gradient-to-r from-accent-400 to-glow bg-clip-text text-transparent">
              SSH ID
            </span>
            .
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-400">
            One handle resolves to every SSH public key you own. Drop it into{' '}
            <code className="rounded bg-ink-800 px-1.5 py-0.5 font-mono text-sm text-slate-200">
              authorized_keys
            </code>{' '}
            and let your devices manage the keys behind biometric-protected passkeys.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link to="/register" className="btn-primary">
              Create your SSHID
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a href="#how-it-works" className="btn-ghost">
              See how it works
            </a>
          </div>

          <p className="mt-4 text-sm text-slate-500">
            No passwords. No private keys ever leave your device.
          </p>
        </div>

        <div className="animate-fade-up [animation-delay:120ms]">
          <CodeBlock
            label="your terminal"
            code={`curl ${PUBLIC_HOST}/${SAMPLE_HANDLE} >> ~/.ssh/authorized_keys`}
          >
            <span className="text-slate-500">$ </span>
            <span className="text-accent-400">curl</span>{' '}
            <span className="text-slate-200">
              {PUBLIC_HOST}/{SAMPLE_HANDLE}
            </span>
            {'\n'}
            <span className="text-slate-600">
              {`# SSHID — public keys for @${SAMPLE_HANDLE}`}
            </span>
            {'\n'}
            <span className="text-emerald-300">ssh-ed25519</span>{' '}
            <span className="text-slate-400">AAAAC3NzaC1lZDI1…0kP9</span>{' '}
            <span className="text-slate-600">MacBook Pro</span>
            {'\n'}
            <span className="text-emerald-300">sk-ssh-ed25519@openssh.com</span>{' '}
            <span className="text-slate-400">AAAAGnNrLXNzaC1l…7Qm2</span>{' '}
            <span className="text-slate-600">iPhone 17 Pro</span>
            {'\n'}
            <span className="text-emerald-300">ecdsa-sha2-nistp256</span>{' '}
            <span className="text-slate-400">AAAAE2VjZHNhLXNo…Lk4F</span>{' '}
            <span className="text-slate-600">HP EliteBook 840</span>
          </CodeBlock>
        </div>
      </div>
    </section>
  );
}

const SECURITY = [
  {
    icon: Laptop,
    title: 'Device-bound',
    body: 'Private keys are generated and stored inside each device’s secure enclave. They never leave, never sync, never touch our servers.',
  },
  {
    icon: Fingerprint,
    title: 'Biometric-protected',
    body: 'Every use is gated by Face ID, Touch ID or Windows Hello. A stolen handle is useless without the physical device and its owner.',
  },
  {
    icon: ShieldCheck,
    title: 'Secure access, made simple',
    body: 'Strong, phishing-resistant authentication with none of the key-file juggling. The hard parts are handled for you.',
  },
];

function Security() {
  return (
    <section id="security" className="container-page py-20">
      <SectionHeading eyebrow="Secure by design" title="Passkeys do the heavy lifting" />
      <div className="mt-12 grid gap-5 md:grid-cols-3">
        {SECURITY.map(({ icon: Icon, title, body }) => (
          <div key={title} className="card p-6 transition hover:border-accent-500/40">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-accent-500/10 text-accent-400">
              <Icon className="h-5 w-5" />
            </div>
            <h3 className="mt-5 text-lg font-semibold text-white">{title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">{body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

const STEPS = [
  {
    icon: KeyRound,
    title: 'Create your SSHID',
    body: 'Register a handle and add a passkey from your browser. Your device mints an SSH key pair on the spot.',
  },
  {
    icon: Laptop,
    title: 'Add every device',
    body: 'Sign in from each laptop, phone or workstation and add its key. They all live behind one handle.',
  },
  {
    icon: ScrollText,
    title: 'Publish to authorized_keys',
    body: 'On any server, pull your keys into ~/.ssh/authorized_keys with a single curl. No agents to install.',
  },
  {
    icon: Zap,
    title: 'Connect in one command',
    body: 'SSH as usual. The right key is selected automatically and unlocked with your biometrics.',
  },
];

function HowItWorks() {
  return (
    <section id="how-it-works" className="border-y border-ink-800/60 bg-ink-900/30 py-20">
      <div className="container-page">
        <SectionHeading eyebrow="Set up in minutes" title="From handle to connection in four steps" />
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map(({ icon: Icon, title, body }, i) => (
            <div key={title} className="card relative p-6">
              <span className="absolute right-5 top-5 font-mono text-sm text-ink-600">
                0{i + 1}
              </span>
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-accent-500/10 text-accent-400">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mt-5 text-base font-semibold text-white">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">{body}</p>
            </div>
          ))}
        </div>

        <div className="mx-auto mt-12 max-w-2xl">
          <CodeBlock
            label="on any server"
            code={`mkdir -p ~/.ssh && curl -fsSL ${PUBLIC_HOST}/alex >> ~/.ssh/authorized_keys`}
          >
            <span className="text-slate-500">$ </span>
            <span className="text-accent-400">mkdir</span> -p ~/.ssh{'\n'}
            <span className="text-slate-500">$ </span>
            <span className="text-accent-400">curl</span> -fsSL {PUBLIC_HOST}/alex{' '}
            <span className="text-slate-300">&gt;&gt;</span> ~/.ssh/authorized_keys
          </CodeBlock>
        </div>
      </div>
    </section>
  );
}

const AUDIENCES = [
  { icon: UserCog, title: 'System administrators', body: 'Roll keys across fleets without distributing files by hand.' },
  { icon: TerminalSquare, title: 'Developers', body: 'One handle works from every machine you code on.' },
  { icon: Layers, title: 'Platform engineers', body: 'Bake a single curl into your provisioning scripts.' },
  { icon: Users, title: 'Contractors', body: 'Grant and revoke access by handle, not by chasing key files.' },
];

function UseCases() {
  return (
    <section className="container-page py-20">
      <SectionHeading eyebrow="Built for teams" title="Who SSHID is for" />
      <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {AUDIENCES.map(({ icon: Icon, title, body }) => (
          <div key={title} className="card p-6">
            <Icon className="h-6 w-6 text-accent-400" />
            <h3 className="mt-4 text-base font-semibold text-white">{title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">{body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

const TECH = [
  { icon: TerminalSquare, title: 'Pure SSH standards', body: 'Works with stock OpenSSH and native authorized_keys. Nothing to install on the server.' },
  { icon: Lock, title: 'Private keys stay put', body: 'Only public keys are ever published. The secret half is sealed in your hardware.' },
  { icon: KeyRound, title: 'Modern key types', body: 'Ed25519, ECDSA, RSA and FIDO security keys (sk-* algorithms) are all supported.' },
  { icon: Wrench, title: 'Self-hostable', body: 'A single container, SQLite storage and a clean API. Run it on your own infrastructure.' },
];

function UnderTheHood() {
  return (
    <section className="border-t border-ink-800/60 bg-ink-900/30 py-20">
      <div className="container-page">
        <SectionHeading eyebrow="Under the hood" title="Boring on purpose, where it counts" />
        <div className="mt-12 grid gap-5 sm:grid-cols-2">
          {TECH.map(({ icon: Icon, title, body }) => (
            <div key={title} className="card flex gap-4 p-6">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-accent-500/10 text-accent-400">
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-white">{title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-400">{body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="container-page py-24">
      <div className="card relative overflow-hidden px-8 py-14 text-center shadow-glow">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-accent-500/10 to-transparent" />
        <div className="relative">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Claim your handle in seconds
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-slate-400">
            Free, open-source, and yours to self-host. Register a passkey and start sharing your keys
            the simple way.
          </p>
          <div className="mt-8 flex justify-center">
            <Link to="/register" className="btn-primary">
              Create your SSHID
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function SectionHeading({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="max-w-2xl">
      <p className="text-sm font-semibold uppercase tracking-widest text-accent-400">{eyebrow}</p>
      <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">{title}</h2>
    </div>
  );
}
