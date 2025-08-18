import { PaletteIcon } from 'lucide-react'
import { useThemeStore } from "../hooks/useThemestore.js";
import { THEMES } from '../constants/index.js'

const ThemeSelector = () => {
  const theme = useThemeStore(state => state.theme)
  const setTheme = useThemeStore(state => state.setTheme)

  return (
    <div className='dropdown dropdown-end '>
      <button tabIndex={0} className='btn btn-ghost btn-circle'>
        <PaletteIcon className='size-5' />
      </button>
      <div tabIndex={0}
        className='dropdown-content menu p-2 shadow-2xl bg-base-200 overflow-y-auto max-h-80 border-base-content/10 w-56'>
        <div className='space-y-1'>
          {THEMES.map((themeOption) => (
            <button key={themeOption.name}
              className={`w-full px-4 py-3 rounded-xl flex items-center gap-3 transition-colors
                ${theme === themeOption.name ? "bg-primary/10 text-primary" : "hover:bg-primary/5"}`}
              onClick={() => setTheme(themeOption.name)}
            >
              <span className=' font-bold   text-base-content'>{themeOption.label}</span>
              <div className="ml-auto flex gap-1">
                {themeOption.colors.map((color, i) => (
                  <span
                    key={i}
                    className="size-2 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export default ThemeSelector