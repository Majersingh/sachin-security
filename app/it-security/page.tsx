import IT from '@/app/components/It-service'
import Link from 'next/link'

export default function Services(){
  return (
    <section className='bg-slate-900 pb-16 text-white overflow-hidden'>
      {/* Existing IT Services Component */}
      <IT/>
      {/* Primary Global Site Call to Action */}
      <div className="text-center mt-20">
        <Link 
          href="/#contact" 
          className="inline-block bg-linear-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 px-8 py-4 rounded-lg font-semibold text-lg transition-all duration-300 hover:scale-105 hover:shadow-[0_0_30px_rgba(251,191,36,0.4)] text-slate-900"
        >
          Request a Free Consultation
        </Link>
      </div>
    </section>
  )
}
