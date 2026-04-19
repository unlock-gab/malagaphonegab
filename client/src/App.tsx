import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { AdminLangProvider } from "@/context/AdminLangContext";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import Products from "@/pages/Products";
import ProductDetail from "@/pages/ProductDetail";
import ProductLanding from "@/pages/ProductLanding";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import AdminProducts from "@/pages/admin/AdminProducts";
import AdminOrders from "@/pages/admin/AdminOrders";
import AdminSettings from "@/pages/admin/AdminSettings";
import AdminDelivery from "@/pages/admin/AdminDelivery";
import AdminConfirmateurs from "@/pages/admin/AdminConfirmateurs";
import AdminIPBlocker from "@/pages/admin/AdminIPBlocker";
import AdminAbandoned from "@/pages/admin/AdminAbandoned";
import AdminShippers from "@/pages/admin/AdminShippers";
import AdminLogin from "@/pages/admin/AdminLogin";
import AdminCategories from "@/pages/admin/AdminCategories";
import AdminBrands from "@/pages/admin/AdminBrands";
import AdminSuppliers from "@/pages/admin/AdminSuppliers";
import AdminPurchases from "@/pages/admin/AdminPurchases";
import AdminInventory from "@/pages/admin/AdminInventory";
import AdminExpenses from "@/pages/admin/AdminExpenses";
import AdminProfit from "@/pages/admin/AdminProfit";
import AdminReports from "@/pages/admin/AdminReports";
import AdminCustomers from "@/pages/admin/AdminCustomers";
import AdminAfterSale from "@/pages/admin/AdminAfterSale";
import AdminPOS from "@/pages/admin/AdminPOS";
import AdminInvoices from "@/pages/admin/AdminInvoices";
import AdminPartners from "@/pages/admin/AdminPartners";
import AdminSupplierReturns from "@/pages/admin/AdminSupplierReturns";
import AdminUsers from "@/pages/admin/AdminUsers";
import AdminRoles from "@/pages/admin/AdminRoles";
import ConfirmateurOrders from "@/pages/confirmateur/ConfirmateurOrders";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useEffect } from "react";

function ScrollToTop() {
  const [location] = useLocation();
  useEffect(() => { window.scrollTo({ top: 0, left: 0, behavior: "instant" }); }, [location]);
  return null;
}

function StoreLayout({ children }: { children: React.ReactNode }) {
  return (<><Navbar />{children}<Footer /></>);
}

function ConfirmateurGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();
  useEffect(() => {
    if (!loading && !user) navigate("/admin/login");
    if (!loading && user && user.role !== "confirmateur") navigate("/admin");
  }, [user, loading]);
  if (loading || !user || user.role !== "confirmateur") return null;
  return <>{children}</>;
}

function Router() {
  return (
    <>
      <ScrollToTop />
      <Switch>
        <Route path="/admin/login" component={AdminLogin} />
        <Route path="/admin" component={AdminDashboard} />
        <Route path="/admin/products" component={AdminProducts} />
        <Route path="/admin/categories" component={AdminCategories} />
        <Route path="/admin/brands" component={AdminBrands} />
        <Route path="/admin/suppliers" component={AdminSuppliers} />
        <Route path="/admin/purchases" component={AdminPurchases} />
        <Route path="/admin/inventory" component={AdminInventory} />
        <Route path="/admin/expenses" component={AdminExpenses} />
        <Route path="/admin/profit" component={AdminProfit} />
        <Route path="/admin/orders" component={AdminOrders} />
        <Route path="/admin/delivery" component={AdminDelivery} />
        <Route path="/admin/settings" component={AdminSettings} />
        <Route path="/admin/confirmateurs" component={AdminConfirmateurs} />
        <Route path="/admin/ip-blocker" component={AdminIPBlocker} />
        <Route path="/admin/abandoned" component={AdminAbandoned} />
        <Route path="/admin/shippers" component={AdminShippers} />
        <Route path="/admin/reports" component={AdminReports} />
        <Route path="/admin/customers" component={AdminCustomers} />
        <Route path="/admin/after-sale" component={AdminAfterSale} />
        <Route path="/admin/pos" component={AdminPOS} />
        <Route path="/admin/invoices" component={AdminInvoices} />
        <Route path="/admin/partners" component={AdminPartners} />
        <Route path="/admin/supplier-returns" component={AdminSupplierReturns} />
        <Route path="/admin/users" component={AdminUsers} />
        <Route path="/admin/roles" component={AdminRoles} />
        <Route path="/confirmateur/orders">
          <ConfirmateurGuard><ConfirmateurOrders /></ConfirmateurGuard>
        </Route>
        <Route path="/landing/:id" component={ProductLanding} />
        <Route path="/">
          <StoreLayout><Home /></StoreLayout>
        </Route>
        <Route path="/products">
          <StoreLayout><Products /></StoreLayout>
        </Route>
        <Route path="/products/:id">
          <StoreLayout><ProductDetail /></StoreLayout>
        </Route>
        <Route component={NotFound} />
      </Switch>
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <AdminLangProvider>
            <Toaster />
            <Router />
          </AdminLangProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
