import {
  Search,
  PackageSearch,
  LoaderCircle,
  Check,
} from "lucide-react";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

const RESULT_LIMIT = 30;

function ProductSearchPicker({
  value,
  onChange,
  fallbackProducts = [],
  inStockOnly = false,
  disabled = false,
  placeholder = "Search by product, brand or category...",
}) {
  const hasDesktopApi =
    typeof window !== "undefined" &&
    Boolean(
      window.glamstock
        ?.products
        ?.getPage
    );

  const [search, setSearch] =
    useState("");

  const [
    debouncedSearch,
    setDebouncedSearch,
  ] = useState("");

  const [results, setResults] =
    useState([]);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  useEffect(() => {
    if (!hasDesktopApi) {
      return undefined;
    }

    const timer =
      window.setTimeout(
        () => {
          setDebouncedSearch(
            search.trim()
          );
        },
        250
      );

    return () =>
      window.clearTimeout(timer);
  }, [search, hasDesktopApi]);

  useEffect(() => {
    if (!hasDesktopApi) {
      return undefined;
    }

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError("");

      try {
        const result =
          await window.glamstock
            .products
            .getPage({
              page: 1,
              limit: RESULT_LIMIT,
              search:
                debouncedSearch,
              inStockOnly,
            });

        if (!cancelled) {
          setResults(
            Array.isArray(
              result?.products
            )
              ? result.products
              : []
          );
        }
      } catch (loadError) {
        if (!cancelled) {
          setResults([]);
          setError(
            loadError?.message ||
              "Could not search products."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [
    debouncedSearch,
    hasDesktopApi,
    inStockOnly,
    value?.updatedAt,
  ]);

  const browserResults =
    useMemo(() => {
      if (hasDesktopApi) {
        return [];
      }

      const term =
        search
          .trim()
          .toLowerCase();

      return (
        Array.isArray(
          fallbackProducts
        )
          ? fallbackProducts
          : []
      )
        .filter(
          (product) => {
            if (
              inStockOnly &&
              Number(
                product.stock || 0
              ) <= 0
            ) {
              return false;
            }

            if (!term) {
              return true;
            }

            return [
              product.name,
              product.brand,
              product.category,
            ].some((field) =>
              String(
                field || ""
              )
                .toLowerCase()
                .includes(term)
            );
          }
        )
        .slice(
          0,
          RESULT_LIMIT
        );
    }, [
      fallbackProducts,
      hasDesktopApi,
      inStockOnly,
      search,
    ]);

  const displayed =
    hasDesktopApi
      ? results
      : browserResults;

  const chooseProduct = (
    product
  ) => {
    onChange?.(product);

    setSearch(
      product?.name || ""
    );
  };

  return (
    <div className="product-picker-field">
      <div className="search-box product-picker-search">
        <Search size={18} />

        <input
          value={search}
          onChange={(event) =>
            setSearch(
              event.target.value
            )
          }
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="off"
        />

        {loading && (
          <LoaderCircle
            className="spin"
            size={17}
          />
        )}
      </div>

      {value && (
        <div className="selected-product-card">
          <div className="selected-product-icon">
            <Check size={17} />
          </div>

          <div>
            <strong>
              {value.name}
            </strong>

            <span>
              {value.brand
                ? `${value.brand} · `
                : ""}
              {value.stock}{" "}
              {value.unitType ??
                value.unit_type ??
                "piece"}{" "}
              in stock
            </span>
          </div>
        </div>
      )}

      <div className="product-picker-results">
        {error ? (
          <div className="picker-message error">
            {error}
          </div>
        ) : !loading &&
          displayed.length === 0 ? (
          <div className="picker-message">
            <PackageSearch
              size={18}
            />
            No matching products.
          </div>
        ) : (
          displayed.map(
            (product) => {
              const unit =
                product.unitType ??
                product.unit_type ??
                "piece";

              const selected =
                String(
                  value?.id || ""
                ) ===
                String(
                  product.id
                );

              return (
                <button
                  key={product.id}
                  type="button"
                  className={
                    selected
                      ? "product-picker-option selected"
                      : "product-picker-option"
                  }
                  onClick={() =>
                    chooseProduct(
                      product
                    )
                  }
                  disabled={disabled}
                >
                  <span>
                    <strong>
                      {
                        product.name
                      }
                    </strong>

                    <small>
                      {product.brand ||
                        product.category ||
                        "Product"}
                    </small>
                  </span>

                  <span className="product-picker-stock">
                    {product.stock}{" "}
                    {unit}
                  </span>
                </button>
              );
            }
          )
        )}
      </div>
    </div>
  );
}

export default ProductSearchPicker;
