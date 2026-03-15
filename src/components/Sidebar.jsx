import { useState, useEffect } from "react";
import navIcon from "../assets/img/navIcon.png";
import {
  LayoutDashboard,
  Users,
  ChevronDown,
  PackagePlus,
  TrendingUp,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronRight,
} from "lucide-react";

const menuItems = [
  {
    name: "Inventory",
    icon: <LayoutDashboard size={20} />,
    component: "inventory",
  },
  {
    name: "Update Items",
    icon: <PackagePlus size={20} />,
    component: "inventory-item",
  },
  {
    name: "Customers",
    icon: <Users size={20} />,
    component: "customers",
  },
  {
    name: "Purchase Summary",
    icon: <TrendingUp size={20} />,
    component: "loan-summary",
  },
];

function findSelectedName(activeComponent) {
  const item = menuItems.find(i => i.component === activeComponent);
  return item ? item.name : "Inventory";
}

const Sidebar = ({ activeComponent, setActiveComponent, isCollapsed, setIsCollapsed }) => {
  const [selected, setSelected] = useState(() => findSelectedName(activeComponent));

  useEffect(() => {
    setSelected(findSelectedName(activeComponent));
  }, [activeComponent]);

  const handleItemClick = (item) => {
    setSelected(item.name);
    if (item.component) setActiveComponent(item.component);
  };

  return (
    <aside className={`${isCollapsed ? "w-20" : "w-full max-w-[250px]"} min-h-screen shrink-0 p-4 border-0 border-r border-[#17BCBE] bg-white lg:min-h-[100vh] transition-all duration-300 ease-in-out relative group`}>
      <div className={`flex items-center ${isCollapsed ? "justify-center" : "gap-2.5"} mb-6`}>
        <img className="h-8 w-8 min-w-[32px]" src={navIcon} alt="Logo" />
        {!isCollapsed && <span className="text-xl font-bold text-[#108587] leading-tight lg:text-2xl whitespace-nowrap overflow-hidden">Stockease</span>}
      </div>

      <button 
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-70 bg-white border border-[#17BCBE] rounded-full p-1 text-[#108587] hover:bg-[#E8F8F9] transition-colors z-10 shadow-sm"
        aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {isCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
      </button>

      <ul className="space-y-2 mt-6">
        {menuItems.map((item) => (
          <li key={item.name}>
            <div
              className={`flex items-center ${isCollapsed ? "justify-center" : "gap-3"} p-2.5 rounded-lg cursor-pointer w-full transition-all duration-200
                ${selected === item.name 
                  ? "bg-[#E8F8F9] text-[#108587] border-l-[3px] border-[#17BCBE] shadow-sm font-semibold" 
                  : "text-[#17BCBE] hover:bg-[#E8F8F9]/50 hover:text-[#108587]"}`}
              onClick={() => handleItemClick(item)}
              title={isCollapsed ? item.name : ""}
            >
              <span className={`shrink-0 transition-transform duration-200 ${selected === item.name ? "scale-110" : "group-hover:scale-110"}`}>
                {item.icon}
              </span>
              {!isCollapsed && (
                <span className="text-sm tracking-tight truncate">
                  {item.name}
                </span>
              )}
            </div>
          </li>
        ))}
      </ul>
    </aside>
  );
};

export default Sidebar;
