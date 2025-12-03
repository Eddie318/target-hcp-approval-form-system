import { NavBar, TabBar, Card, Space } from "antd-mobile";
import { AppOutline, CheckShieldOutline, UnorderedListOutline } from "antd-mobile-icons";
import "./app.css";

const tabs = [
  { key: "list", title: "流程", icon: <UnorderedListOutline /> },
  { key: "approve", title: "审批", icon: <CheckShieldOutline /> },
  { key: "me", title: "我的", icon: <AppOutline /> },
];

function App() {
  return (
    <div className="page">
      <NavBar backArrow={false}>审批系统（移动端）</NavBar>
      <div className="content">
        <Space direction="vertical" block>
          <Card title="提示">
            前端框架已搭建，等待接入真实接口（鉴权、流程列表、审批操作等）。
            目前为占位内容，方便后续对接。
          </Card>
        </Space>
      </div>
      <TabBar>
        {tabs.map((item) => (
          <TabBar.Item key={item.key} icon={item.icon} title={item.title} />
        ))}
      </TabBar>
    </div>
  );
}

export default App;
