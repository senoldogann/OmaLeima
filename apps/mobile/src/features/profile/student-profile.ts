import { useMutation, useQuery, useQueryClient, type UseMutationResult, type UseQueryResult } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";

import type {
  AttachDepartmentTagResult,
  CreateCustomDepartmentTagResult,
  DepartmentTagSourceType,
  DepartmentTagSuggestion,
  StudentProfileOverview,
  StudentProfileTag,
} from "@/features/profile/types";

type ProfileRow = {
  id: string;
  email: string;
  display_name: string | null;
  primary_role: "STUDENT";
  status: "ACTIVE";
};

type ProfileDepartmentTagLinkRow = {
  id: string;
  department_tag_id: string;
  is_primary: boolean;
  slot: number;
};

type DepartmentTagRow = {
  id: string;
  title: string;
  slug: string;
  university_name: string | null;
  city: string | null;
  source_type: DepartmentTagSourceType;
};

type UseStudentProfileOverviewQueryParams = {
  studentId: string;
  isEnabled: boolean;
};

type AttachDepartmentTagMutationParams = {
  studentId: string;
  departmentTagId: string;
  currentTags: StudentProfileTag[];
};

type CreateCustomDepartmentTagMutationParams = {
  studentId: string;
  title: string;
  currentTags: StudentProfileTag[];
};

type SetPrimaryDepartmentTagMutationParams = {
  studentId: string;
  linkId: string;
};

type RemoveDepartmentTagMutationParams = {
  studentId: string;
  tag: StudentProfileTag;
  remainingTags: StudentProfileTag[];
};

type PostgrestErrorLike = {
  message: string;
  code?: string | null;
  details?: string | null;
};

const MAX_PROFILE_TAGS = 3;

export const studentProfileOverviewQueryKey = (studentId: string) => ["student-profile-overview", studentId] as const;

const isOfficialTagSource = (sourceType: DepartmentTagSourceType): boolean =>
  sourceType === "CLUB" || sourceType === "ADMIN";

const normalizeTitle = (value: string): string => value.trim().replace(/\s+/g, " ");

const createSlugBase = (value: string): string => {
  const normalizedValue = normalizeTitle(value)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-+|-+$)/g, "");

  return normalizedValue === "" ? "department-tag" : normalizedValue;
};

const createUniqueSlug = (title: string, existingSlugs: Set<string>): string => {
  const slugBase = createSlugBase(title);

  if (!existingSlugs.has(slugBase)) {
    return slugBase;
  }

  let suffix = 2;

  while (existingSlugs.has(`${slugBase}-${suffix}`)) {
    suffix += 1;
  }

  return `${slugBase}-${suffix}`;
};

const toErrorMessage = (prefix: string, error: PostgrestErrorLike): string => {
  const errorDetails = error.details ? ` (${error.details})` : "";

  return `${prefix}: ${error.message}${errorDetails}`;
};

const compareDepartmentTags = (left: DepartmentTagRow, right: DepartmentTagRow): number => {
  if (isOfficialTagSource(left.source_type) !== isOfficialTagSource(right.source_type)) {
    return isOfficialTagSource(left.source_type) ? -1 : 1;
  }

  return left.title.localeCompare(right.title, "en");
};

const compareSelectedTags = (left: StudentProfileTag, right: StudentProfileTag): number => {
  if (left.isPrimary !== right.isPrimary) {
    return left.isPrimary ? -1 : 1;
  }

  return left.slot - right.slot;
};

const mapTagSuggestion = (row: DepartmentTagRow): DepartmentTagSuggestion => ({
  id: row.id,
  title: row.title,
  slug: row.slug,
  universityName: row.university_name,
  city: row.city,
  sourceType: row.source_type,
  isOfficial: isOfficialTagSource(row.source_type),
});

const fetchProfileAsync = async (studentId: string): Promise<ProfileRow> => {
  const { data, error } = await supabase
    .from("profiles")
    .select("id,email,display_name,primary_role,status")
    .eq("id", studentId)
    .single<ProfileRow>();

  if (error !== null) {
    throw new Error(toErrorMessage(`Failed to load student profile ${studentId}`, error));
  }

  return data;
};

const fetchProfileDepartmentTagLinksAsync = async (studentId: string): Promise<ProfileDepartmentTagLinkRow[]> => {
  const { data, error } = await supabase
    .from("profile_department_tags")
    .select("id,department_tag_id,is_primary,slot")
    .eq("profile_id", studentId)
    .order("slot", { ascending: true })
    .returns<ProfileDepartmentTagLinkRow[]>();

  if (error !== null) {
    throw new Error(toErrorMessage(`Failed to load profile tag links for ${studentId}`, error));
  }

  return data;
};

const fetchActiveDepartmentTagsAsync = async (): Promise<DepartmentTagRow[]> => {
  const { data, error } = await supabase
    .from("department_tags")
    .select("id,title,slug,university_name,city,source_type")
    .eq("status", "ACTIVE")
    .returns<DepartmentTagRow[]>();

  if (error !== null) {
    throw new Error(toErrorMessage("Failed to load active department tags", error));
  }

  return [...data].sort(compareDepartmentTags);
};

const mapSelectedTags = (
  links: ProfileDepartmentTagLinkRow[],
  departmentTags: DepartmentTagRow[]
): StudentProfileTag[] => {
  const departmentTagById = new Map(departmentTags.map((departmentTag) => [departmentTag.id, departmentTag] as const));

  return links
    .flatMap((link) => {
      const departmentTag = departmentTagById.get(link.department_tag_id);

      if (typeof departmentTag === "undefined") {
        return [];
      }

      return [
        {
          linkId: link.id,
          departmentTagId: link.department_tag_id,
          title: departmentTag.title,
          slug: departmentTag.slug,
          universityName: departmentTag.university_name,
          city: departmentTag.city,
          sourceType: departmentTag.source_type,
          isOfficial: isOfficialTagSource(departmentTag.source_type),
          isPrimary: link.is_primary,
          slot: link.slot,
        },
      ];
    })
    .sort(compareSelectedTags);
};

export const fetchStudentProfileOverviewAsync = async (studentId: string): Promise<StudentProfileOverview> => {
  const [profile, selectedTagLinks, activeDepartmentTags] = await Promise.all([
    fetchProfileAsync(studentId),
    fetchProfileDepartmentTagLinksAsync(studentId),
    fetchActiveDepartmentTagsAsync(),
  ]);

  const selectedTags = mapSelectedTags(selectedTagLinks, activeDepartmentTags);
  const selectedTagIds = new Set(selectedTags.map((tag) => tag.departmentTagId));
  const suggestedTags = activeDepartmentTags
    .filter((tag) => !selectedTagIds.has(tag.id))
    .map(mapTagSuggestion);

  return {
    studentId: profile.id,
    email: profile.email,
    displayName: profile.display_name,
    primaryRole: profile.primary_role,
    status: profile.status,
    selectedTags,
    suggestedTags,
    selectedTagCount: selectedTags.length,
    remainingTagSlots: Math.max(MAX_PROFILE_TAGS - selectedTags.length, 0),
  };
};

const attachDepartmentTagAsync = async ({
  studentId,
  departmentTagId,
  currentTags,
}: AttachDepartmentTagMutationParams): Promise<AttachDepartmentTagResult> => {
  if (currentTags.some((tag) => tag.departmentTagId === departmentTagId)) {
    return {
      status: "ALREADY_SELECTED",
      departmentTagId,
    };
  }

  const { error } = await supabase.from("profile_department_tags").insert({
    profile_id: studentId,
    department_tag_id: departmentTagId,
    is_primary: currentTags.length === 0,
    source_type: "SELF_SELECTED",
  });

  if (error !== null) {
    if (error.code === "23505") {
      return {
        status: "ALREADY_SELECTED",
        departmentTagId,
      };
    }

    throw new Error(toErrorMessage(`Failed to attach department tag ${departmentTagId}`, error));
  }

  return {
    status: "ADDED",
    departmentTagId,
  };
};

const createCustomDepartmentTagAsync = async ({
  studentId,
  title,
  currentTags,
}: CreateCustomDepartmentTagMutationParams): Promise<CreateCustomDepartmentTagResult> => {
  const normalizedTitle = normalizeTitle(title);

  if (normalizedTitle === "") {
    throw new Error("Custom department tag title is required.");
  }

  const activeDepartmentTags = await fetchActiveDepartmentTagsAsync();
  const existingTag = activeDepartmentTags.find(
    (tag) => normalizeTitle(tag.title).toLowerCase() === normalizedTitle.toLowerCase() || tag.slug === createSlugBase(normalizedTitle)
  );

  if (typeof existingTag !== "undefined") {
    const attachResult = await attachDepartmentTagAsync({
      studentId,
      departmentTagId: existingTag.id,
      currentTags,
    });

    return {
      status: attachResult.status === "ALREADY_SELECTED" ? "ALREADY_SELECTED" : "ATTACHED_EXISTING",
      departmentTagId: existingTag.id,
    };
  }

  const existingSlugs = new Set(activeDepartmentTags.map((tag) => tag.slug));
  const slug = createUniqueSlug(normalizedTitle, existingSlugs);

  const { data, error } = await supabase
    .from("department_tags")
    .insert({
      title: normalizedTitle,
      slug,
      source_type: "USER",
      created_by: studentId,
      status: "ACTIVE",
    })
    .select("id")
    .single<{ id: string }>();

  if (error !== null) {
    throw new Error(toErrorMessage(`Failed to create custom department tag "${normalizedTitle}"`, error));
  }

  const attachResult = await attachDepartmentTagAsync({
    studentId,
    departmentTagId: data.id,
    currentTags,
  });

  return {
    status: attachResult.status === "ALREADY_SELECTED" ? "ALREADY_SELECTED" : "CREATED_AND_ADDED",
    departmentTagId: data.id,
  };
};

const setPrimaryDepartmentTagAsync = async ({
  studentId,
  linkId,
}: SetPrimaryDepartmentTagMutationParams): Promise<void> => {
  const clearPrimaryResult = await supabase
    .from("profile_department_tags")
    .update({ is_primary: false })
    .eq("profile_id", studentId)
    .eq("is_primary", true);

  if (clearPrimaryResult.error !== null) {
    throw new Error(toErrorMessage(`Failed to clear current primary tag for ${studentId}`, clearPrimaryResult.error));
  }

  const setPrimaryResult = await supabase
    .from("profile_department_tags")
    .update({ is_primary: true })
    .eq("profile_id", studentId)
    .eq("id", linkId);

  if (setPrimaryResult.error !== null) {
    throw new Error(toErrorMessage(`Failed to set primary tag ${linkId}`, setPrimaryResult.error));
  }
};

const removeDepartmentTagAsync = async ({
  studentId,
  tag,
  remainingTags,
}: RemoveDepartmentTagMutationParams): Promise<void> => {
  const deleteResult = await supabase
    .from("profile_department_tags")
    .delete()
    .eq("profile_id", studentId)
    .eq("id", tag.linkId);

  if (deleteResult.error !== null) {
    throw new Error(toErrorMessage(`Failed to remove department tag ${tag.departmentTagId}`, deleteResult.error));
  }

  if (!tag.isPrimary || remainingTags.length === 0) {
    return;
  }

  const fallbackTag = [...remainingTags].sort(compareSelectedTags)[0];

  const setPrimaryResult = await supabase
    .from("profile_department_tags")
    .update({ is_primary: true })
    .eq("profile_id", studentId)
    .eq("id", fallbackTag.linkId);

  if (setPrimaryResult.error !== null) {
    throw new Error(toErrorMessage(`Failed to promote fallback primary tag ${fallbackTag.linkId}`, setPrimaryResult.error));
  }
};

export const useStudentProfileOverviewQuery = ({
  studentId,
  isEnabled,
}: UseStudentProfileOverviewQueryParams): UseQueryResult<StudentProfileOverview, Error> =>
  useQuery({
    queryKey: studentProfileOverviewQueryKey(studentId),
    queryFn: async () => fetchStudentProfileOverviewAsync(studentId),
    enabled: isEnabled,
  });

export const useAttachDepartmentTagMutation = (): UseMutationResult<
  AttachDepartmentTagResult,
  Error,
  AttachDepartmentTagMutationParams
> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: attachDepartmentTagAsync,
    onSuccess: async (_result, variables) => {
      await queryClient.invalidateQueries({
        queryKey: studentProfileOverviewQueryKey(variables.studentId),
      });
    },
  });
};

export const useCreateCustomDepartmentTagMutation = (): UseMutationResult<
  CreateCustomDepartmentTagResult,
  Error,
  CreateCustomDepartmentTagMutationParams
> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createCustomDepartmentTagAsync,
    onSuccess: async (_result, variables) => {
      await queryClient.invalidateQueries({
        queryKey: studentProfileOverviewQueryKey(variables.studentId),
      });
    },
  });
};

export const useSetPrimaryDepartmentTagMutation = (): UseMutationResult<
  void,
  Error,
  SetPrimaryDepartmentTagMutationParams
> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: setPrimaryDepartmentTagAsync,
    onSuccess: async (_result, variables) => {
      await queryClient.invalidateQueries({
        queryKey: studentProfileOverviewQueryKey(variables.studentId),
      });
    },
  });
};

export const useRemoveDepartmentTagMutation = (): UseMutationResult<
  void,
  Error,
  RemoveDepartmentTagMutationParams
> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: removeDepartmentTagAsync,
    onSuccess: async (_result, variables) => {
      await queryClient.invalidateQueries({
        queryKey: studentProfileOverviewQueryKey(variables.studentId),
      });
    },
  });
};
