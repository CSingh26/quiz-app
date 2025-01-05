"use client"

import Link from 'next/link'

const LoginLinks = () => {
    return (
        <div className="flex gap-10 mt-16 custom-font-2">
            <Link 
                href="/login/student"
                className='bg-white text-[#3c6ca8] px-10 py-4 rounded-full font-bold text-lg shawdow hover:scale-105 transition-transform'
            >
                Login as Student
            </Link>
            <Link 
                href="/login/signup"
                className='bg-white text-[#3c6ca8] px-10 py-4 rounded-full font-bold text-lg shawdow hover:scale-105 transition-transform'
            >
                Login as Insructor
            </Link>
        </div>
    )
}

export default LoginLinks