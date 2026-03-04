/**
 * Manager Architecture Page
 * Reuses the same admin architecture component.
 * Managers have full access to zone/QR management per the role matrix.
 */
import AdminArchitecturePage from "@/app/(dashboard)/admin/architecture/page";

export default function ManagerArchitecturePage() {
    return <AdminArchitecturePage />;
}
