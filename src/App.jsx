import { useApp } from "./store.jsx";
import Nav from "./components/Nav.jsx";
import { TopBar } from "./components/ui.jsx";
import SheetView from "./views/SheetView.jsx";
import HomeView from "./views/HomeView.jsx";
import PersonView from "./views/PersonView.jsx";
import InvoiceView from "./views/InvoiceView.jsx";
import ExpenseForm from "./views/ExpenseForm.jsx";
import MembersView from "./views/MembersView.jsx";

const VIEWS = { sheet: SheetView, home: HomeView, person: PersonView, invoice: InvoiceView, expense: ExpenseForm, members: MembersView };

function Body() {
  const { status, view, p } = useApp();
  if (status === "loading") return <>
    <TopBar title="Sổ Ghi Nợ" />
    <div className="skel" /><div className="skel" /><div className="skel" />
    <p className="hint" style={{ textAlign: "center" }}>Đang mở sổ…</p>
  </>;
  if (status === "nodb") return <>
    <TopBar title="Sổ Ghi Nợ" />
    <div className="card empty"><b>Chưa kết nối được nơi lưu dữ liệu</b>Hãy mở app này trên claude.ai khi đã đăng nhập tài khoản của bạn. Dữ liệu sổ nợ được lưu trong tài khoản đó.</div>
  </>;
  const View = VIEWS[view] || SheetView;
  // key: đổi người / khoản chi thì màn được làm mới từ đầu
  return <View key={view + (p.mid || "") + (p.id || "")} />;
}

export default function App() {
  const { view } = useApp();
  return <>
    <div className={"wrap" + (view === "sheet" ? " wide" : "")}><Body /></div>
    <Nav />
  </>;
}
