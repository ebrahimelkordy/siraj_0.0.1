
import Sidebar from './Sidebar'
import Navbar from './Navbar'
function Layout({ showSidebar = false, children }) {
  return (
    <div className='min-h-screen'>
      <div className='flex '>

        {showSidebar && <Sidebar />}
        <div className='flex-1 flex flex-col'>
          <Navbar />
          <div>

            <main>
              {children}
            </main>



          </div>



        </div>



      </div>
    </div>

  )
}

export default Layout