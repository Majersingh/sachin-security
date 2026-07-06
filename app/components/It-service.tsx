'use client';

import { useInView } from 'react-intersection-observer';
import { Download, Monitor, Activity, Camera, Lock, ShieldCheck, AlertCircle, Clock, CheckCircle } from 'lucide-react';
import Link from 'next/link';

interface ITSectionProps {
  headerRef?: React.RefObject<HTMLDivElement>;
  contentRef?: React.RefObject<HTMLDivElement>;
  headerInView?: boolean;
  contentInView?: boolean;
}

export default function ITSection({ 
  headerRef, 
  contentRef, 
  headerInView = false, 
  contentInView = false 
}: ITSectionProps) {
  const [imageRef, imageInView] = useInView({
    threshold: 0.1,
    triggerOnce: true
  });

  return (
  <>
    <section id="it-security" className="py-4 bg-slate-900 overflow-hidden">
      {/* Background accent */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-amber-500/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-0 right-0 w-80 h-80 bg-amber-400/5 rounded-full blur-[100px]" />
      
      <div className="container mx-auto px-6 relative z-10">
        {/* Header */}
        <div
          ref={headerRef}
          className={`text-center mb-16 transition-all duration-1000 ${
            headerInView ? 'opacity-100 translate-y-0' : 'opacity-80 translate-y-10'
          }`}
        >
          <div className="flex justify-center mb-6">
            <ShieldCheck className="w-16 h-16 text-amber-400" />
          </div>
          <h2 className="text-4xl md:text-5xl font-bold mb-4 text-white">
            Advanced{' '}
            <span className="bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-500 bg-clip-text text-transparent">
              IT Security & Monitoring
            </span>
          </h2>
          <p className="text-xl text-amber-400 font-semibold max-w-2xl mx-auto">
            24/7 Digital Protection with Centralized CCTV Monitoring & Real-time Threat Detection [web:5][web:6]
          </p>
        </div>

        {/* Main Content - Two Columns */}
        <div
          ref={contentRef}
          className={`max-w-7xl mx-auto mb-16 sition-all duration-1000 delay-200 ${
            contentInView ? 'opacity-100 translate-y-0' : 'opacity-80 translate-y-10'
          }`}
        >
          <div className="grid lg:grid-cols-2 gap-8 items-start">
            {/* Left Side - Content */}
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-8 rounded-2xl border border-amber-400/20 shadow-xl space-y-6">
              <div className="text-slate-300 leading-relaxed space-y-2">
                <div className="flex items-center gap-3 p-8 bg-amber-500/5 border border-amber-500/20 rounded-xl">
                  <Monitor className="w-8 h-8 text-amber-400 flex-shrink-0" />
                  <div>
                    <h3 className="text-xl font-semibold text-white mb-1">Centralized Monitoring Centers</h3>
                    <p className="text-amber-300">Trained operators ensure instant detection and response to incidents [web:5]</p>
                  </div>
                </div>

                <p className="text-lg">
                  Sachin Security Services provides comprehensive IT security solutions featuring{' '}
                  <span className="text-amber-400 font-semibold">real-time CCTV surveillance</span> and advanced monitoring systems 
                  for industries, corporate offices, and retail environments.
                </p>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="flex items-start gap-3 p-4 bg-slate-700/50 rounded-xl border-l-4 border-amber-400">
                    <Activity className="w-6 h-6 text-amber-400 mt-1 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold text-white mb-1">24/7 Threat Monitoring</h4>
                      <p className="text-sm text-slate-400">Continuous surveillance with rapid response capabilities [web:6]</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-4 bg-slate-700/50 rounded-xl border-l-4 border-amber-400">
                    <Lock className="w-6 h-6 text-amber-400 mt-1 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold text-white mb-1">Access Control Systems</h4>
                      <p className="text-sm text-slate-400">Secure entry points and credential verification [web:12]</p>
                    </div>
                  </div>
                </div>

                {/* <div className="bg-gradient-to-r from-amber-500/10 to-amber-400/10 border border-amber-400/30 p-6 rounded-2xl">
                  <p className="text-white font-semibold text-lg italic text-center">
                    "Advanced technology meets expert vigilance - protecting your digital assets around the clock" [web:6]
                  </p>
                </div> */}

                <div className="pt-1 border-t border-slate-700/50">
                  <p className="text-amber-400 font-semibold">
                    Trusted since 1996 with ISO 9001:2015 certification for quality assured IT security services [web:6]
                  </p>
                </div>
              </div>
            </div>

            {/* Right Side - Feature Cards */}
            <div className="space-y-4 lg:sticky lg:top-8">
              <div className="bg-gradient-to-b from-slate-800/80 to-slate-900/80 backdrop-blur-sm p-6 rounded-2xl border border-amber-400/20 shadow-2xl">
                <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                  <Camera className="w-6 h-6 text-amber-400" />
                  Our IT Security Services
                </h3>
                
                <div className="space-y-3">
                  {[
                    { icon: Camera, title: "CCTV Surveillance", desc: "Advanced camera systems with AI analytics", color: "from-blue-500/20 to-cyan-500/20" },
                    { icon: AlertCircle, title: "Real-time Alerts", desc: "Instant notifications for security events", color: "from-red-500/20 to-orange-500/20" },
                    { icon: ShieldCheck, title: "Access Management", desc: "Biometric & RFID entry control systems", color: "from-emerald-500/20 to-teal-500/20" },
                    { icon: Clock, title: "24/7 Monitoring", desc: "Round-the-clock centralized operations", color: "from-amber-500/20 to-yellow-500/20" },
                    { icon: CheckCircle, title: "Compliance Ready", desc: "ISO certified security protocols", color: "from-purple-500/20 to-violet-500/20" }
                  ].map((service, index) => (
                    <div
                      key={index}
                      ref={index === 0 ? imageRef : undefined}
                      className={`group p-4 rounded-xl border border-slate-700/50 hover:border-amber-400/50 transition-all duration-300 hover:shadow-amber/10 hover:scale-[1.02] hover:-translate-y-1 ${
                        imageInView ? `delay-${(index + 1) * 100} opacity-100 translate-y-0` : 'opacity-0 translate-y-4'
                      } bg-gradient-to-r ${service.color} hover:shadow-lg`}
                    >
                      <div className="flex items-start gap-3">
                        <service.icon className="w-8 h-8 text-amber-400 group-hover:scale-110 transition-transform mt-0.5 flex-shrink-0" />
                        <div>
                          <h4 className="font-semibold text-white mb-1">{service.title}</h4>
                          <p className="text-sm text-slate-300">{service.desc}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="text-center mt-16">
            <a
            href="/IT-docs.pdf"
            download="Sachin-Security-IT-Services-Brochure.pdf"
            className=" flex flex-row justify-center text-amber-500 px-8 py-2 rounded-lg font-semibold text-lg transition-all duration-300 hover:scale-105 hover:shadow-[0_0_30px_rgba(251,191,36,0.4)] focus:outline-none focus:ring-4 focus:ring-amber-400/50"
            > < Download/> <span>Brochure</span>
            </a>
        </div>
      </div>
    </section>
    <section className='bg-slate-900'>
        {/* 🛡️ Side-by-Side Split: Details vs Live PDF Embed */}
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-stretch">
          
          {/* LEFT COLUMN: Specifications & Action Details (5/12 width) */}
          <div className="lg:col-span-5 flex flex-col justify-between space-y-6">
            <div className="space-y-6">
              <div>
                <span className="bg-red-500/10 text-red-400 text-xs font-semibold px-3 py-1 rounded-full border border-red-500/20 uppercase tracking-wider">
                  Our Flagship Platform
                </span>
                <h3 className="text-3xl sm:text-4xl font-extrabold mt-4 text-white tracking-tight leading-tight">
                  AI-Powered Integrated <br />
                  <span className="bg-linear-to-r from-red-500 to-amber-500 bg-clip-text text-transparent">
                    Physical Security
                  </span>
                </h3>
              </div>

              <p className="text-slate-300 text-base leading-relaxed">
                Transforming enterprise security from manpower-heavy reactivity to automated, proactive intelligence. Expand surveillance coverage by 300% while reducing physical guarding overhead costs by up to 50%.
              </p>

              {/* Core Ecosystem Modules */}
              <div className="space-y-4 pt-2">
                <div className="flex gap-3">
                  <div className="shrink-0 w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center text-red-400 font-bold text-sm">01</div>
                  <div>
                    <h4 className="font-semibold text-slate-100 text-sm">Centralized Command Center</h4>
                    <p className="text-xs text-slate-400 mt-0.5">Every geographic facility and system mapped natively to a single screen interface.</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="shrink-0 w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center text-red-400 font-bold text-sm">02</div>
                  <div>
                    <h4 className="font-semibold text-slate-100 text-sm">Computer Vision Suite</h4>
                    <p className="text-xs text-slate-400 mt-0.5">Automated detection rules targeting zone intrusions, safety gear compliance, and early fire.</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="shrink-0 w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center text-red-400 font-bold text-sm">03</div>
                  <div>
                    <h4 className="font-semibold text-slate-100 text-sm">Intelligent Gateway Access</h4>
                    <p className="text-xs text-slate-400 mt-0.5">Contactless QR-based pre-registration completely bypassing physical security lobby delays.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Live Interactive Document Viewer Frame (7/12 width) */}
          <div className="lg:col-span-7 flex flex-col">
            <div className="relative bg-slate-950 border border-slate-800 rounded-xl shadow-2xl overflow-hidden flex-1 flex flex-col h-[550px] lg:h-full min-h-[500px]">
              
              {/* Browser Window Style Header UI */}
              <div className="bg-slate-900 border-b border-slate-800 px-4 py-3 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span className="text-slate-400 font-mono tracking-wide text-xs">PRODUCT_PROPOSAL.PDF</span>
                </div>
                <div className="flex gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-slate-700" />
                  <div className="w-2 h-2 rounded-full bg-slate-700" />
                  <div className="w-2 h-2 rounded-full bg-slate-700" />
                </div>
              </div>

              {/* Embedded Document Frame Component */}
              <div className="relative w-full flex-1 bg-slate-900">
                <iframe 
                  src="/it-ai-product.pdf#toolbar=0&navpanes=0" 
                  title="Sachin Security Solutions AI Platform Proposal"
                  className="w-full h-full border-0 absolute inset-0"
                  loading="lazy"
                >
                  <p className="text-sm text-slate-400 p-4 text-center">
                    Your browser does not support inline document viewing. 
                    <a href="/security-proposal.pdf" className="text-red-400 underline ml-1">Click here to access the file directly.</a>
                  </p>
                </iframe>
              </div>

              {/* Mobile Compatibility / Direct Access Download Bar */}
              <div className="bg-slate-900/90 border-t border-slate-800 px-4 py-2.5 flex items-center justify-between text-xs text-slate-400 shrink-0">
                <span>Interactive Viewer Mode</span>
                <a 
                  href="/it-ai-product.pdf" 
                  download="Sachin-Security-AI-Platform-Proposal.pdf"
                  className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded font-medium transition-all"
                >
                  <span>📥</span> Download Full Copy
                </a>
              </div>

            </div>
          </div>

        </div>
      </div>
    </section>
  </>
  );
}
