"""Shared Notion IDs. Single source of truth for every Python script."""

WORKSPACE_ROOT = "35177fd266b5810ab4cde191170ee8dc"

# Sidebar pages
PAGES = {
    "dashboard":     "35177fd266b5818e8e21d201ceef6505",
    "inbox":         "35177fd266b58194b01aca4edeb1c61c",
    "clients":       "35177fd266b581a8b12ec17f7d90b58b",
    "people":        "35177fd266b581e78f80d7530e76d863",
    "pipeline":      "35177fd266b5817e8472fc420c4aaab7",
    "projects":      "35177fd266b58186a6aafc676cd79b8a",
    "notes_calls":   "35177fd266b581a7985ec439c5aae80a",
    "invoices":      "35177fd266b58172b187efa762ac82ee",
    "templates":     "35177fd266b5812183b2c656d7adba0e",
    "operations":    "35177fd266b581d7b2a5d387d692b6be",
}

# Database data-source IDs (use these for query / page-create calls)
DATA_SOURCES = {
    "clients":      "764227d2-6549-4924-b9ac-5a82962db191",
    "people":       "02725411-76c7-4c06-abe3-9ffe4dacb8ff",
    "pipeline":     "8737dfd8-1a04-4b53-a892-3833bbf4fa48",
    "projects":     "cb6b65c3-502b-42c1-a9fb-e9733d09892d",
    "tasks":        "8cfb2c44-f92f-4945-abf4-95ff33a66c9e",
    "notes_calls":  "6fbeb595-1118-472a-afc7-08abb975e52d",
    "invoices":     "f309c46e-bb54-48a9-b94d-3283ebcc4d3d",
    "templates":    "5b701431-ece8-4853-afcf-bb1556aa8e6a",
}

STALE_CLIENT_THRESHOLD_DAYS = 14
