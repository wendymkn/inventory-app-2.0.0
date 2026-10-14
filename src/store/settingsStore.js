import { create } from "zustand";

const defaultBusiness = {
  name:
    "GlamStock Beauty Store",

  tagline: "",

  logo: "",

  phone: "",

  email: "",

  address: "",

  kraPin: "",

  registrationNumber: "",

  receiptFooter:
    "Thank you for shopping with us!",

  receiptSize: "80mm",
};

const hasElectronBusinessApi =
  () =>
    typeof window !==
      "undefined" &&
    Boolean(
      window.glamstock
        ?.business
    );


const announceBusinessChange = (detail) => {
  if (
    typeof window === "undefined" ||
    typeof window.dispatchEvent !== "function"
  ) {
    return;
  }

  window.dispatchEvent(
    new CustomEvent(
      "glamstock:business-changed",
      { detail }
    )
  );
};

const useSettingsStore =
  create((set, get) => ({
    business:
      defaultBusiness,

    currency: "KSh",

    lowStockAlerts: true,

    loaded: false,

    loading: false,

    error: null,

    updateBusiness: (
      updates
    ) =>
      set((state) => ({
        business: {
          ...state.business,
          ...updates,
        },
      })),

    updateCurrency: (
      currency
    ) =>
      set({
        currency,
      }),

    updateLowStockAlerts: (
      enabled
    ) =>
      set({
        lowStockAlerts:
          Boolean(enabled),
      }),

    hydrateFromDatabase:
      async () => {
        /*
          Browser-only development
          won't have Electron IPC.
        */
        if (
          !hasElectronBusinessApi()
        ) {
          set({
            loaded: true,
            loading: false,
          });

          return {
            success: true,
            localOnly: true,
          };
        }

        set({
          loading: true,
          error: null,
        });

        try {
          const saved =
            await window.glamstock
              .business.get();

          if (saved) {
            set({
              business: {
                ...defaultBusiness,

                name:
                  saved.name ||
                  defaultBusiness.name,

                tagline:
                  saved.tagline ||
                  "",

                logo:
                  saved.logo ||
                  "",

                phone:
                  saved.phone ||
                  "",

                email:
                  saved.email ||
                  "",

                address:
                  saved.address ||
                  "",

                kraPin:
                  saved.kraPin ||
                  "",

                registrationNumber:
                  saved.registrationNumber ||
                  "",

                receiptFooter:
                  saved.receiptFooter ||
                  defaultBusiness
                    .receiptFooter,

                receiptSize:
                  saved.receiptSize ||
                  "80mm",
              },

              currency:
                saved.currency ||
                "KSh",

              lowStockAlerts:
                saved.lowStockAlerts !==
                false,
            });
          }

          set({
            loaded: true,
            loading: false,
            error: null,
          });

          return {
            success: true,
          };
        } catch (error) {
          console.error(
            "Business settings load failed:",
            error
          );

          set({
            loaded: true,
            loading: false,

            error:
              error?.message ||
              "Could not load business settings.",
          });

          return {
            success: false,

            message:
              error?.message ||
              "Could not load business settings.",
          };
        }
      },

    saveSettings:
      async ({
        business,
        currency,
        lowStockAlerts,
      }) => {
        const nextBusiness = {
          ...get().business,
          ...(business || {}),
        };

        const nextCurrency =
          currency ??
          get().currency;

        const nextAlerts =
          lowStockAlerts ??
          get().lowStockAlerts;

        /*
          Update screen immediately.
        */
        set({
          business:
            nextBusiness,

          currency:
            nextCurrency,

          lowStockAlerts:
            Boolean(
              nextAlerts
            ),

          error: null,
        });

        /*
          Browser-only fallback.
        */
        if (
          !hasElectronBusinessApi()
        ) {
          return {
            success: true,
            localOnly: true,
          };
        }

        try {
          const saved =
            await window.glamstock
              .business.update({
                ...nextBusiness,

                currency:
                  nextCurrency,

                lowStockAlerts:
                  Boolean(
                    nextAlerts
                  ),
              });

          const persisted =
            saved &&
            typeof saved === "object"
              ? saved
              : {
                  ...nextBusiness,
                  currency: nextCurrency,
                  lowStockAlerts:
                    Boolean(nextAlerts),
                };

          const nextState = {
            business: {
              ...defaultBusiness,

              name:
                persisted.name ||
                nextBusiness.name ||
                defaultBusiness.name,

              tagline:
                persisted.tagline ??
                nextBusiness.tagline ??
                "",

              logo:
                persisted.logo ??
                nextBusiness.logo ??
                "",

              phone:
                persisted.phone ??
                nextBusiness.phone ??
                "",

              email:
                persisted.email ??
                nextBusiness.email ??
                "",

              address:
                persisted.address ??
                nextBusiness.address ??
                "",

              kraPin:
                persisted.kraPin ??
                nextBusiness.kraPin ??
                "",

              registrationNumber:
                persisted.registrationNumber ??
                nextBusiness.registrationNumber ??
                "",

              receiptFooter:
                persisted.receiptFooter ||
                nextBusiness.receiptFooter ||
                defaultBusiness.receiptFooter,

              receiptSize:
                persisted.receiptSize ||
                nextBusiness.receiptSize ||
                "80mm",
            },

            currency:
              persisted.currency ||
              nextCurrency ||
              "KSh",

            lowStockAlerts:
              persisted.lowStockAlerts !==
              false,

            error: null,
          };

          set(nextState);
          announceBusinessChange(nextState);

          return {
            success: true,
            business: persisted,
          };
        } catch (error) {
          console.error(
            "Business settings save failed:",
            error
          );

          const message =
            error?.message ||
            "Could not save business settings.";

          set({
            error: message,
          });

          return {
            success: false,
            message,
          };
        }
      },

    resetBusiness:
      async () => {
        return get().saveSettings({
          business:
            defaultBusiness,

          currency: "KSh",

          lowStockAlerts: true,
        });
      },
  }));

/*
  Electron preload is available
  before React starts, so hydrate
  business settings automatically.
*/

if (
  typeof window !==
  "undefined"
) {
  queueMicrotask(() => {
    useSettingsStore
      .getState()
      .hydrateFromDatabase();
  });
}

export default useSettingsStore;