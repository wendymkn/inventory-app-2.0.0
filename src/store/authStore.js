import {
  create,
} from "zustand";

const WORKER_PERMISSIONS =
  new Set([
    "dashboard",
    "view_dashboard",

    "products",
    "view_products",

    "stock_in",
    "stock_out",

    "pos",

    "sales",
    "view_sales",

    "receipts",
    "view_receipts",

    "customers",
    "view_customers",
    "add_customers",
  ]);

const hasDesktopAuth = () =>
  typeof window !==
    "undefined" &&
  Boolean(
    window.glamstock
      ?.auth
  );

const useAuthStore =
  create(
    (
      set,
      get
    ) => ({
      currentUser:
        null,

      users: [],

      setupRequired:
        null,

      setupLoading:
        true,

      loading:
        false,

      error:
        null,

      checkSetup:
        async () => {
          if (
            !hasDesktopAuth()
          ) {
            set({
              setupRequired:
                false,

              setupLoading:
                false,
            });

            return;
          }

          try {
            const result =
              await window
                .glamstock
                .auth
                .setupStatus();

            set({
              setupRequired:
                Boolean(
                  result
                    ?.setupRequired
                ),

              setupLoading:
                false,
            });
          } catch (error) {
            set({
              setupLoading:
                false,

              error:
                error?.message ||
                "Could not check GlamStock setup.",
            });
          }
        },

      createOwner:
        async (
          ownerData
        ) => {
          if (
            !hasDesktopAuth()
          ) {
            return {
              success: false,

              message:
                "Owner setup requires the GlamStock desktop application.",
            };
          }

          set({
            loading: true,
            error: null,
          });

          try {
            const result =
              await window
                .glamstock
                .auth
                .createOwner(
                  ownerData
                );

            if (
              !result?.success
            ) {
              set({
                loading:
                  false,

                error:
                  result?.message ||
                  "Could not create owner account.",
              });

              return result;
            }

            set({
              currentUser:
                result.user,

              setupRequired:
                false,

              setupLoading:
                false,

              loading:
                false,

              error:
                null,
            });

            return {
              success: true,

              user:
                result.user,
            };
          } catch (error) {
            const message =
              error?.message ||
              "Could not create owner account.";

            set({
              loading:
                false,

              error:
                message,
            });

            return {
              success: false,
              message,
            };
          }
        },

      login:
        async (
          username,
          password
        ) => {
          if (
            !hasDesktopAuth()
          ) {
            return {
              success: false,

              message:
                "Secure login is only available inside the GlamStock desktop application.",
            };
          }

          set({
            loading: true,
            error: null,
          });

          try {
            const result =
              await window
                .glamstock
                .auth
                .login({
                  username,
                  password,
                });

            if (
              result?.setupRequired
            ) {
              set({
                setupRequired:
                  true,

                loading:
                  false,
              });

              return result;
            }

            if (
              !result?.success
            ) {
              set({
                loading:
                  false,

                error:
                  result?.message ||
                  "Login failed.",
              });

              return result;
            }

            if (
              result.user
                ?.mustChangePassword
            ) {
              set({
                loading:
                  false,

                error:
                  null,
              });

              return {
                ...result,

                mustChangePassword:
                  true,
              };
            }

            set({
              currentUser:
                result.user,

              loading:
                false,

              error:
                null,
            });

            return {
              success: true,

              user:
                result.user,
            };
          } catch (error) {
            const message =
              error?.message ||
              "Login failed.";

            set({
              loading:
                false,

              error:
                message,
            });

            return {
              success: false,
              message,
            };
          }
        },

      completeRequiredPasswordChange:
        async (
          newPassword
        ) => {
          try {
            const result =
              await window
                .glamstock
                .auth
                .changePassword({
                  newPassword,
                });

            if (
              !result?.success
            ) {
              return result;
            }

            set({
              currentUser:
                result.user,

              error:
                null,
            });

            return {
              success: true,

              user:
                result.user,
            };
          } catch (error) {
            return {
              success: false,

              message:
                error?.message ||
                "Could not change password.",
            };
          }
        },

      changePassword:
        async (
          currentPassword,
          newPassword
        ) => {
          try {
            return await window
              .glamstock
              .auth
              .changePassword({
                currentPassword,
                newPassword,
              });
          } catch (error) {
            return {
              success: false,

              message:
                error?.message ||
                "Could not change password.",
            };
          }
        },

      logout: () => {
        set({
          currentUser:
            null,

          users: [],

          error:
            null,
        });

        if (
          hasDesktopAuth()
        ) {
          window.glamstock
            .auth
            .logout()
            .catch(
              () => {}
            );
        }
      },

      hasPermission:
        (permission) => {
          const user =
            get()
              .currentUser;

          if (!user) {
            return false;
          }

          if (
            user.role ===
            "admin"
          ) {
            return true;
          }

          if (
            user.role !==
            "worker"
          ) {
            return false;
          }

          return WORKER_PERMISSIONS
            .has(
              permission
            );
        },

      loadUsers:
        async () => {
          const user =
            get()
              .currentUser;

          if (
            user?.role !==
            "admin"
          ) {
            return {
              success: false,

              message:
                "Administrator access required.",
            };
          }

          try {
            const users =
              await window
                .glamstock
                .auth
                .users
                .getAll();

            set({
              users:
                Array.isArray(
                  users
                )
                  ? users
                  : [],
            });

            return {
              success: true,
            };
          } catch (error) {
            return {
              success: false,

              message:
                error?.message ||
                "Could not load users.",
            };
          }
        },

      addUser:
        async (
          userData
        ) => {
          try {
            const result =
              await window
                .glamstock
                .auth
                .users
                .create(
                  userData
                );

            if (
              result?.success
            ) {
              await get()
                .loadUsers();
            }

            return result;
          } catch (error) {
            return {
              success: false,

              message:
                error?.message ||
                "Could not create user.",
            };
          }
        },

      updateUser:
        async (
          id,
          userData
        ) => {
          try {
            const result =
              await window
                .glamstock
                .auth
                .users
                .update(
                  id,
                  userData
                );

            if (
              result?.success
            ) {
              const current =
                get().currentUser;

              const updatingSelf =
                current &&
                String(current.id) ===
                  String(id);

              if (
                updatingSelf &&
                userData?.password
              ) {
                set({
                  currentUser: null,
                  users: [],
                  error: null,
                });

                return {
                  ...result,
                  requiresReauth: true,
                };
              }

              if (
                updatingSelf &&
                result.user
              ) {
                set({
                  currentUser: {
                    ...current,
                    ...result.user,
                  },
                });
              }

              await get()
                .loadUsers();
            }

            return result;
          } catch (error) {
            return {
              success: false,

              message:
                error?.message ||
                "Could not update user.",
            };
          }
        },

      deleteUser:
        async (
          id
        ) => {
          try {
            const result =
              await window
                .glamstock
                .auth
                .users
                .remove(
                  id
                );

            if (
              result?.success
            ) {
              await get()
                .loadUsers();
            }

            return result;
          } catch (error) {
            return {
              success: false,

              message:
                error?.message ||
                "Could not deactivate user.",
            };
          }
        },
    })
  );

export default useAuthStore;