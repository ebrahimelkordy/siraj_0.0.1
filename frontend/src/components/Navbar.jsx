import React from 'react'
import useAutheUser from '../hooks/useAutheUser'
import { redirect, useLocation } from 'react-router'
import ThemeSelector from './ThemeSelector.jsx'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { logout } from '../lib/api'
import { Link } from 'react-router'
import sirajLogo from '../assests/isisi.png';
import { BellIcon, LogOutIcon, HomeIcon, UsersIcon, Layers } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { getUserNotifications } from '../lib/notifications';
import useLogout from '../hooks/useLogout.js'


const Navbar = () => {
  const { authUser } = useAutheUser()
  const location = useLocation()
  const isChatPage = location.pathname?.startsWith('/chat')
  const queryClient = useQueryClient()
  const { logoutMutation } = useLogout()

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: getUserNotifications,
  });
  const notificationsCount = notifications.filter(n => !n.read).length;

  return (
    <nav className="bg-base-200 border-b border-base-300 sticky top-0 z-30 h-10 flex items-center ">
      <div className="container mx-auto ">
        <div className="flex items-center gap-2 justify-between w-full">
          {/* LOGO */}
          <Link to="/" className="flex items-center gap-2.5">
            <img src={sirajLogo} alt="logo" className="size-9 text-primary " />
            {/* كلمة Siraj تظهر فقط من md وأعلى */}
            <span className="hidden md:inline text-2xl font-bold font-mono bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary  tracking-wider">
              Siraj
            </span>
          </Link>
          {/* عناصر السايدبار للأجهزة الصغيرة فقط */}
          <div className="flex items-center gap-0.5 md:flex">
            <Link to="/" className={`btn btn-ghost btn-circle p-0 ${location.pathname === '/' ? 'btn-active' : ''}`} title="Home">
              <HomeIcon className="w-4 h-4" />
            </Link>
            <Link to="/friends" className={`btn btn-ghost btn-circle p-0 ${location.pathname === '/friends' ? 'btn-active' : ''}`} title="Friends">
              <UsersIcon className="w-4 h-4" />
            </Link>
            <Link to="/groups" className={`btn btn-ghost btn-circle p-0 ${location.pathname === '/groups' ? 'btn-active' : ''}`} title="Groups">
              <Layers className="w-4 h-4" />
            </Link>
            <Link to="/notifications" className="btn btn-ghost btn-circle indicator p-0" title="Notifications">
              <BellIcon className="w-4 h-4" />
              {notificationsCount > 0 && (
                <span className="indicator-item badge badge-error badge-xs">{notificationsCount}</span>
              )}
            </Link>
            {/* دروب داون منيو ثلاث نقط: صورة، ثيمات، خروج */}
            <div className="dropdown dropdown-end">
              <button tabIndex={0} className="btn btn-ghost btn-circle p-0 flex items-center justify-center">
                <span className="text-xl font-bold">&#8942;</span>
              </button>
              <ul tabIndex={0} className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-48 mt-2">
                <li className="flex items-center gap-2 px-2 py-1">
                  <div className="avatar">
                    <div className="w-8 h-8 rounded-full overflow-hidden">
                      <img src={authUser?.profilePic} alt="User Avatar" className="object-cover w-full h-full" />
                    </div>
                  </div>
                  <span className="font-semibold text-sm truncate">{authUser?.fullName}</span>
                </li>
                <li className="menu-title px-2 py-1">Theme</li>
                <li className="px-2 py-1"><ThemeSelector /></li>
                <li className="divider my-1"></li>
                <li>
                  <button className="w-full text-left px-2 py-2" onClick={() => { navigator.clipboard.writeText(authUser?._id); }}>
                    Copy User ID
                  </button>
                </li>
                <li><button className="w-full text-left px-2 py-2" onClick={logoutMutation}>Logout</button></li>
              </ul>
            </div>
          </div>
          {/* باقي عناصر النافبار للأجهزة المتوسطة والكبيرة */}
          {/* <div className="hidden md:flex items-center gap-6 sm:gap-8 ml-auto"> ... </div> تم التعطيل ليظهر ستايل الموبايل في كل الشاشات */}
        </div>
      </div>
    </nav>

  )


}


export default Navbar