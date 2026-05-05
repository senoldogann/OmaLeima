import { useLocalSearchParams } from "expo-router";

import { AnnouncementDetailScreen } from "@/features/announcements/announcement-detail-screen";

export default function BusinessAnnouncementDetailRoute() {
    const params = useLocalSearchParams<{ announcementId?: string }>();

    return (
        <AnnouncementDetailScreen
            announcementId={typeof params.announcementId === "string" ? params.announcementId : null}
            backHref="/business/updates"
        />
    );
}