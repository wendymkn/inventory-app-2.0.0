import {
  create,
} from "zustand";

const useLicenseStore =
  create((set, get) => ({
    status: null,

    loading: true,

    error: null,

    refresh:
      async () => {
        if (
          typeof window ===
            "undefined" ||
          !window.glamstock
            ?.license
        ) {
          set({
            loading: false,

            error:
              "License service is unavailable.",
          });

          return {
            success: false,
          };
        }

        try {
          const status =
            await window
              .glamstock
              .license
              .status();

          set({
            status,
            loading: false,
            error: null,
          });

          return {
            success: true,
            status,
          };
        } catch (error) {
          const message =
            error?.message ||
            "Could not verify GlamStock license.";

          set({
            loading: false,
            error: message,
          });

          return {
            success: false,
            message,
          };
        }
      },

    activate:
      async (
        licenseText
      ) => {
        try {
          const result =
            await window
              .glamstock
              .license
              .activate(
                licenseText
              );

          if (
            !result?.success
          ) {
            return result;
          }

          set({
            status:
              result.status,

            error: null,
          });

          return result;
        } catch (error) {
          return {
            success: false,

            message:
              error?.message ||
              "Could not activate GlamStock.",
          };
        }
      },
  }));

export default useLicenseStore;