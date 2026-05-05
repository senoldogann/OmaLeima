import { useQuery, type UseQueryResult } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";

export type PublicClubDirectoryItem = {
    city: string | null;
    clubId: string;
    clubName: string;
    contactEmail: string | null;
    coverImageUrl: string | null;
    logoUrl: string | null;
    universityName: string | null;
};

type ClubRow = {
    city: string | null;
    contact_email: string | null;
    cover_image_url: string | null;
    id: string;
    logo_url: string | null;
    name: string;
    university_name: string | null;
};

type UsePublicClubDirectoryQueryParams = {
    isEnabled: boolean;
};

export const publicClubDirectoryQueryKey = ["public-club-directory"] as const;

const fetchPublicClubDirectoryAsync = async (): Promise<PublicClubDirectoryItem[]> => {
    const { data, error } = await supabase
        .from("clubs")
        .select("id,name,city,university_name,logo_url,cover_image_url,contact_email")
        .eq("status", "ACTIVE")
        .order("name", { ascending: true })
        .returns<ClubRow[]>();

    if (error !== null) {
        throw new Error(`Failed to load public club directory: ${error.message}`);
    }

    return data.map((club) => ({
        city: club.city,
        clubId: club.id,
        clubName: club.name,
        contactEmail: club.contact_email,
        coverImageUrl: club.cover_image_url,
        logoUrl: club.logo_url,
        universityName: club.university_name,
    }));
};

export const usePublicClubDirectoryQuery = ({
    isEnabled,
}: UsePublicClubDirectoryQueryParams): UseQueryResult<PublicClubDirectoryItem[], Error> =>
    useQuery({
        queryKey: publicClubDirectoryQueryKey,
        queryFn: fetchPublicClubDirectoryAsync,
        enabled: isEnabled,
        staleTime: 1000 * 60 * 5,
    });