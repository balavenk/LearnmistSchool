import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BookOpen, Users, Brain, Activity, ArrowRight, CheckCircle2, Shield, Zap, Contact } from 'lucide-react';

const Home = () => {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-indigo-200">
      {/* Navigation */}
      <nav
        className={`fixed top-0 w-full z-50 transition-all duration-300 ${
          scrolled ? 'bg-white/80 backdrop-blur-md shadow-sm py-3' : 'bg-transparent py-5'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => scrollToSection('home')}>
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
               <BookOpen className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-blue-600 tracking-tight">
              BRINYMIST
            </span>
          </div>
          
          <div className="hidden md:flex items-center space-x-8">
            <button onClick={() => scrollToSection('home')} className="text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors">Home</button>
            <button onClick={() => scrollToSection('features')} className="text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors">Features</button>
            <button onClick={() => scrollToSection('pricing')} className="text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors">Pricing</button>
            <button onClick={() => scrollToSection('contact')} className="text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors">Contact Us</button>
          </div>

          <div className="flex items-center gap-4">
            <Link to="/login" className="text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors">
              Login
            </Link>
            <button 
              onClick={() => scrollToSection('contact')}
              className="px-4 py-2 rounded-full bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-all hover:shadow-lg hover:shadow-indigo-600/30 active:scale-95"
            >
              Book a Demo
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section id="home" className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-blue-50/50 -z-10" />
        {/* Decorative elements */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-300/20 rounded-full blur-3xl -z-10" />
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-300/20 rounded-full blur-3xl -z-10" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-100/80 text-indigo-700 text-sm font-medium mb-8 border border-indigo-200/50">
            <span className="flex h-2 w-2 rounded-full bg-indigo-600"></span>
            Empowering modern education
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8">
            The all-in-one platform for <br className="hidden md:block"/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-blue-500">
              smarter schools.
            </span>
          </h1>
          <p className="max-w-2xl mx-auto text-lg md:text-xl text-slate-600 mb-10 leading-relaxed">
            Manage classes, automate grading with AI, extract questions from PDFs, and empower teachers and students with a unified educational ecosystem.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button 
              onClick={() => scrollToSection('features')}
              className="px-8 py-4 rounded-full bg-slate-900 text-white text-base font-medium hover:bg-slate-800 transition-all w-full sm:w-auto"
            >
              Explore Features
            </button>
            <button 
              onClick={() => scrollToSection('contact')}
              className="group px-8 py-4 rounded-full bg-white text-slate-900 text-base font-medium hover:bg-indigo-50 border border-slate-200 transition-all flex items-center justify-center gap-2 w-full sm:w-auto shadow-sm"
            >
              Book a Demo
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Everything you need to run your school</h2>
            <p className="text-lg text-slate-600">
              BrinymistSchool combines administrative tools, AI-powered question banks, and learning management into one seamless experience.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="p-8 rounded-2xl bg-slate-50 border border-slate-100 hover:border-indigo-100 hover:shadow-xl hover:shadow-indigo-100/50 transition-all group">
              <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-3">School Management</h3>
              <p className="text-slate-600 leading-relaxed">
                Comprehensive admin dashboard to effortlessly manage classes, teachers, and students. Handle enrollment and track grades in real-time.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-8 rounded-2xl bg-slate-50 border border-slate-100 hover:border-indigo-100 hover:shadow-xl hover:shadow-indigo-100/50 transition-all group lg:-translate-y-4">
              <div className="w-12 h-12 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Brain className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-3">AI-Powered Assessments</h3>
              <p className="text-slate-600 leading-relaxed">
                Automagically extract question banks from PDFs and textbooks. Generate dynamic exams and quizzes seamlessly using state-of-the-art LLMs.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-8 rounded-2xl bg-slate-50 border border-slate-100 hover:border-indigo-100 hover:shadow-xl hover:shadow-indigo-100/50 transition-all group">
              <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Activity className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-3">Teacher Workflows</h3>
              <p className="text-slate-600 leading-relaxed">
                Empower educators with auto-grading, template management, and centralized assignment tracking tools to focus more on teaching.
              </p>
            </div>
            
            {/* Additional lower grid */}
            <div className="lg:col-span-3 grid md:grid-cols-2 gap-8 mt-4">
               <div className="p-8 rounded-2xl bg-gradient-to-br from-indigo-600 to-blue-700 text-white relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20 transition-transform group-hover:scale-150" />
                  <BookOpen className="w-8 h-8 text-indigo-200 mb-6" />
                  <h3 className="text-xl font-bold mb-3">Student Portals</h3>
                  <p className="text-indigo-100 leading-relaxed mb-6 max-w-sm">
                    Dedicated portals for students to view their schedules, track assignment deadlines, and monitor their grades consistently.
                  </p>
                  <ul className="space-y-2 text-indigo-100/90 text-sm">
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4"/> Always up to date</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4"/> Assignment tracking</li>
                  </ul>
               </div>

               <div className="p-8 rounded-2xl bg-slate-900 text-white relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl -mr-20 -mt-20 transition-transform group-hover:scale-150" />
                  <Zap className="w-8 h-8 text-indigo-400 mb-6" />
                  <h3 className="text-xl font-bold mb-3">Independent Learning</h3>
                  <p className="text-slate-300 leading-relaxed max-w-sm">
                    Individual users can leverage our platform's AI to create new quizzes on demand and take quizzes for self-paced learning.
                  </p>
               </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
           <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Simple, transparent pricing</h2>
            <p className="text-lg text-slate-600">
              Choose the plan that fits your institution's size and needs.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Basic Plan */}
            <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm flex flex-col">
              <h3 className="text-xl font-semibold mb-2">Individual</h3>
              <p className="text-slate-500 text-sm mb-6">For self-paced learners.</p>
              <div className="mb-6">
                <span className="text-4xl font-bold">$9</span>
                <span className="text-slate-500">/mo</span>
              </div>
              <ul className="space-y-4 mb-8 flex-1">
                <li className="flex items-center gap-3 text-slate-600"><CheckCircle2 className="w-5 h-5 text-indigo-600" /> On-demand quiz generation</li>
                <li className="flex items-center gap-3 text-slate-600"><CheckCircle2 className="w-5 h-5 text-indigo-600" /> Progress tracking</li>
                <li className="flex items-center gap-3 text-slate-600"><CheckCircle2 className="w-5 h-5 text-indigo-600" /> Basic AI features</li>
              </ul>
              <button 
                onClick={() => navigate('/register')}
                className="w-full py-3 rounded-xl bg-indigo-50 text-indigo-700 font-medium hover:bg-indigo-100 transition-colors"
                >
                Get Started
              </button>
            </div>

            {/* Pro Plan */}
            <div className="bg-indigo-600 rounded-2xl p-8 border border-indigo-500 shadow-xl shadow-indigo-600/20 flex flex-col relative transform md:-translate-y-4">
              <div className="absolute top-0 right-8 -translate-y-1/2 bg-gradient-to-r from-blue-400 to-indigo-400 text-white px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase">
                Most Popular
              </div>
              <h3 className="text-xl font-semibold mb-2 text-white">School</h3>
              <p className="text-indigo-200 text-sm mb-6">For standard size institutions.</p>
              <div className="mb-6 text-white">
                <span className="text-4xl font-bold">$299</span>
                <span className="text-indigo-200">/mo</span>
              </div>
              <ul className="space-y-4 mb-8 flex-1">
                <li className="flex items-center gap-3 text-indigo-50"><CheckCircle2 className="w-5 h-5 text-indigo-300" /> Up to 500 students</li>
                <li className="flex items-center gap-3 text-indigo-50"><CheckCircle2 className="w-5 h-5 text-indigo-300" /> AI Question extraction</li>
                <li className="flex items-center gap-3 text-indigo-50"><CheckCircle2 className="w-5 h-5 text-indigo-300" /> Teacher workflows</li>
                <li className="flex items-center gap-3 text-indigo-50"><CheckCircle2 className="w-5 h-5 text-indigo-300" /> Advanced analytics</li>
              </ul>
              <button 
                onClick={() => scrollToSection('contact')}
                className="w-full py-3 rounded-xl bg-white text-indigo-600 font-medium hover:bg-slate-50 transition-colors shadow-sm"
              >
                Contact Sales
              </button>
            </div>

            {/* Enterprise Plan */}
            <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm flex flex-col">
              <h3 className="text-xl font-semibold mb-2">District</h3>
              <p className="text-slate-500 text-sm mb-6">For large scale operations.</p>
              <div className="mb-6">
                 <span className="text-4xl font-bold">Custom</span>
              </div>
              <ul className="space-y-4 mb-8 flex-1">
                <li className="flex items-center gap-3 text-slate-600"><CheckCircle2 className="w-5 h-5 text-indigo-600" /> Unlimited students</li>
                <li className="flex items-center gap-3 text-slate-600"><CheckCircle2 className="w-5 h-5 text-indigo-600" /> Custom LLM Training</li>
                <li className="flex items-center gap-3 text-slate-600"><CheckCircle2 className="w-5 h-5 text-indigo-600" /> Priority Support</li>
                <li className="flex items-center gap-3 text-slate-600"><CheckCircle2 className="w-5 h-5 text-indigo-600" /> API Access</li>
              </ul>
              <button 
                onClick={() => scrollToSection('contact')}
                className="w-full py-3 rounded-xl bg-indigo-50 text-indigo-700 font-medium hover:bg-indigo-100 transition-colors"
                >
                Book a Demo
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* CTA & Contact Section */}
      <section id="contact" className="py-24 bg-white relative overflow-hidden">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <Shield className="w-16 h-16 text-indigo-100 mx-auto mb-6" />
          <h2 className="text-3xl md:text-4xl font-bold mb-6">Ready to transform your school?</h2>
          <p className="text-lg text-slate-600 mb-10 max-w-2xl mx-auto">
             Get in touch with our team to see a personalized demo of BrinymistSchool and discover how it can save your teachers hours every week.
          </p>
          <div className="bg-slate-50 p-8 md:p-12 rounded-3xl border border-slate-100 shadow-sm max-w-2xl mx-auto flex flex-col gap-4">
             <h3 className="text-xl font-bold flex items-center justify-center gap-2 mb-4"><Contact className="w-6 h-6 text-indigo-600"/> Contact Us</h3>
             <a href="mailto:hello@learnmistschool.com" className="text-lg font-medium text-slate-700 hover:text-indigo-600 transition-colors">hello@learnmistschool.com</a>
             <a href="tel:+15550000000" className="text-lg font-medium text-slate-700 hover:text-indigo-600 transition-colors">+1 (555) 000-0000</a>
             
             <div className="mt-8 pt-8 border-t border-slate-200">
               <button className="px-8 py-4 rounded-full bg-indigo-600 text-white flex justify-center text-base font-medium hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/30 w-full sm:w-auto mx-auto active:scale-95">
                 Let's Talk
               </button>
             </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 border-t border-slate-800 text-slate-400 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-6">
           <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-400" />
            <span className="text-lg font-bold text-white tracking-tight">BRINYMIST</span>
          </div>
          <div className="text-sm">
            © {new Date().getFullYear()} BrinymistSchool. All rights reserved.
          </div>
          <div className="flex gap-4 text-sm">
             <a href="#" className="hover:text-white transition-colors">Privacy</a>
             <a href="#" className="hover:text-white transition-colors">Terms</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;
