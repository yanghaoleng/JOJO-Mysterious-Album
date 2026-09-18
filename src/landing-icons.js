import { Clock3, MessageCircle, MessagesSquare, Sparkles, Lightbulb, Flag, Candy, Users, Sprout, Rocket, CakeSlice, Armchair, Sailboat, Telescope, Route, MapPin, ArrowDown, ArrowUpRight, Footprints, createIcons } from 'lucide';
const icons={Clock3,MessageCircle,MessagesSquare,Sparkles,Lightbulb,Flag,Candy,Users,Sprout,Rocket,CakeSlice,Armchair,Sailboat,Telescope,Route,MapPin,ArrowDown,ArrowUpRight,Footprints};
export function mountJourneyIcons(root){createIcons({icons,root,attrs:{width:20,height:20,'stroke-width':1.7,'aria-hidden':'true'}});}
