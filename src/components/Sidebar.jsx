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
    subItems: [{ name: "Update Items", icon: <PackagePlus size={20} />, component: "inventory-item" }],
  },
  {
    name: "Customers",
    icon: <Users size={20} />,
    component: "customers",
    subItems: [
      { name: "Purchase Summary", icon: <TrendingUp size={20} />, component: "loan-summary" },
    ],
  },
];

function findSelectedName(activeComponent) {
  for (const item of menuItems) {
    if (item.component === activeComponent) return item.name;
    if (item.subItems) {
      for (const sub of item.subItems) {
        if (sub.component === activeComponent) return sub.name;
      }
    }
  }
  return "Update Items";
}

const Sidebar = ({ activeComponent, setActiveComponent, isCollapsed, setIsCollapsed }) => {
  const [selected, setSelected] = useState(() => findSelectedName(activeComponent));
  const [expandedItems, setExpandedItems] = useState({});

  useEffect(() => {
    setSelected(findSelectedName(activeComponent));
  }, [activeComponent]);

  const toggleExpand = (itemName) => {
    setExpandedItems((prev) => ({ ...prev, [itemName]: !prev[itemName] }));
  };

  const handleItemClick = (item, isSubItem = false) => {
    if (!isSubItem && item.subItems) {
      toggleExpand(item.name);
      if (!expandedItems[item.name] && item.component) {
        setActiveComponent(item.component);
      }
    } else {
      setSelected(item.name);
      if (item.component) setActiveComponent(item.component);
    }
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
              className={`flex items-center ${isCollapsed ? "justify-center" : "justify-between"} p-2 rounded-lg cursor-pointer w-full transition-colors
                ${selected === item.name ? "bg-[#E8F8F9] text-[#108587] border-l-[3px] border-[#17BCBE]" : "text-[#17BCBE] hover:bg-[#E8F8F9] hover:text-[#108587]"}`}
              onClick={() => handleItemClick(item)}
              title={isCollapsed ? item.name : ""}
            >
              <div className="flex items-center gap-3 min-w-0">
                {item.icon}
                {!isCollapsed && <span className="text-sm font-medium truncate lg:text-base">{item.name}</span>}
              </div>
              {!isCollapsed && item.subItems && (expandedItems[item.name] ? <ChevronDown size={20} className="shrink-0" /> : <ChevronRight size={20} className="shrink-0" />)}
            </div>

            {!isCollapsed && item.subItems && expandedItems[item.name] && (
              <ul className="ml-6 mt-1 space-y-1">
                {item.subItems.map((subItem) => (
                  <li
                    key={subItem.name}
                    className={`flex items-center p-2 rounded-lg cursor-pointer transition-colors
                      ${selected === subItem.name ? "bg-[#E8F8F9] text-[#108587] border-l-[3px] border-[#17BCBE]" : "text-[#17BCBE] hover:bg-[#E8F8F9] hover:text-[#108587]"}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleItemClick(subItem, true);
                    }}
                  >
                    <span className="text-sm font-medium truncate lg:text-base">{subItem.name}</span>
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </aside>
  );
};

export default Sidebar;
