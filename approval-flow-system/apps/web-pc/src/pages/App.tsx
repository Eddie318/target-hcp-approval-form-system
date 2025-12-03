import { Layout, Menu, Typography, Flex } from "antd";
import {
  FileTextOutlined,
  CheckCircleOutlined,
  CloudUploadOutlined,
  CloudDownloadOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import "./app.css";

const { Header, Content, Sider } = Layout;

const menuItems = [
  { key: "workflows", icon: <FileTextOutlined />, label: "流程列表" },
  { key: "approve", icon: <CheckCircleOutlined />, label: "审批处理" },
  { key: "import", icon: <CloudUploadOutlined />, label: "导入记录" },
  { key: "export", icon: <CloudDownloadOutlined />, label: "导出记录" },
  { key: "approver", icon: <TeamOutlined />, label: "节点人员配置" },
];

function App() {
  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Header
        style={{
          color: "#fff",
          fontSize: 18,
          fontWeight: 600,
          letterSpacing: 1,
        }}
      >
        目标医院 & 药房审批系统（PC）
      </Header>
      <Layout>
        <Sider width={220} style={{ background: "#fff", borderRight: "1px solid #eee" }}>
          <Menu mode="inline" defaultSelectedKeys={["workflows"]} items={menuItems} />
        </Sider>
        <Content style={{ padding: 24 }}>
          <Flex vertical gap={12}>
            <Typography.Title level={4}>欢迎</Typography.Title>
            <Typography.Paragraph>
              前端框架已搭建，待接入实际接口（鉴权、列表、导入/导出、审批人配置等）。
              当前使用占位菜单，可与后端 API 对接后填充对应页面。
            </Typography.Paragraph>
          </Flex>
        </Content>
      </Layout>
    </Layout>
  );
}

export default App;
