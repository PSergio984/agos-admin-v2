import { useEffect } from "react";
import { MapPinned, Plus } from "lucide-react";

import Container from "../../components/ui/Container";
import EmptyList from "../../components/common/EmptyList";
import SearchBar from "../../components/common/SearchBar";
import TableSkeleton from "../../components/common/TableSkeleton";
import { useSites } from "./context/SitesPageContext";
import SiteRow from "./components/SiteRow";
import SiteFormModal from "./components/SiteFormModal";
import DeviceFormModal from "./components/DeviceFormModal";
import ConfirmDeactivateModal from "./components/ConfirmDeactivateModal";

export default function Sites() {
    const {
        filteredSites,
        searchQuery,
        setSearchQuery,
        isFetchingSites,
        siteFormOpen,
        siteFormEditing,
        openSiteForm,
        setSiteFormOpen,
        sitePendingDeactivate,
        setSitePendingDeactivate,
        setSiteActive,
        deviceForm,
        closeDeviceForm,
        devicePendingDeactivate,
        setDevicePendingDeactivate,
        setDeviceActive,
    } = useSites();

    useEffect(() => {
        document.title = "Sites - AGOS";

        return () => {
            document.title = "AGOS";
        };
    }, []);

    return (
        <div className="flex h-full flex-col gap-3">
            {/* Search Bar and New Site Button */}
            <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
                <SearchBar
                    placeholder="Search sites..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
                <button
                    type="button"
                    onClick={() => openSiteForm()}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
                >
                    <Plus className="w-4 h-4" />
                    Add Site
                </button>
            </div>

            {isFetchingSites ? (
                <TableSkeleton title="Sites" rows={5} />
            ) : filteredSites.length === 0 ? (
                <Container headerTitle="Sites" className="flex-1">
                    <EmptyList
                        icon={MapPinned}
                        title={
                            searchQuery.trim()
                                ? `No sites match "${searchQuery.trim()}".`
                                : "No sites yet. Add one to get started."
                        }
                    />
                </Container>
            ) : (
                <Container headerTitle="Sites" className="flex-1">
                    <ul className="divide-y divide-slate-200 dark:divide-slate-700/60">
                        {filteredSites.map((site) => (
                            <SiteRow key={site.id} site={site} />
                        ))}
                    </ul>
                </Container>
            )}

            {siteFormOpen && (
                <SiteFormModal
                    site={siteFormEditing}
                    setOpen={setSiteFormOpen}
                />
            )}

            {sitePendingDeactivate && (
                <ConfirmDeactivateModal
                    title="Deactivate site?"
                    name={sitePendingDeactivate.name}
                    description="Deactivating this site stops its devices and responders from operating under it. You can reactivate it later."
                    onClose={() => setSitePendingDeactivate(null)}
                    onConfirm={async () => {
                        const ok = await setSiteActive(
                            sitePendingDeactivate,
                            false,
                        );
                        if (ok) setSitePendingDeactivate(null);
                    }}
                />
            )}

            {deviceForm && (
                <DeviceFormModal form={deviceForm} onClose={closeDeviceForm} />
            )}

            {devicePendingDeactivate && (
                <ConfirmDeactivateModal
                    title={`Deactivate ${
                        devicePendingDeactivate.kind === "sensor"
                            ? "sensor"
                            : "camera"
                    } device?`}
                    name={devicePendingDeactivate.device.device_name}
                    description="Deactivating this device stops it from reporting data for the site. You can reactivate it later."
                    onClose={() => setDevicePendingDeactivate(null)}
                    onConfirm={async () => {
                        const ok = await setDeviceActive(
                            devicePendingDeactivate.kind,
                            devicePendingDeactivate.device,
                            false,
                        );
                        if (ok) setDevicePendingDeactivate(null);
                    }}
                />
            )}
        </div>
    );
}
