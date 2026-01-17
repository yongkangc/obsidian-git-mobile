if(NOT TARGET hermes-engine::hermesvm)
add_library(hermes-engine::hermesvm SHARED IMPORTED)
set_target_properties(hermes-engine::hermesvm PROPERTIES
    IMPORTED_LOCATION "/home/yk/.gradle/caches/8.13/transforms/4813793d41f8849bc08bce0054980715/transformed/hermes-android-0.14.0-debug/prefab/modules/hermesvm/libs/android.x86/libhermesvm.so"
    INTERFACE_INCLUDE_DIRECTORIES "/home/yk/.gradle/caches/8.13/transforms/4813793d41f8849bc08bce0054980715/transformed/hermes-android-0.14.0-debug/prefab/modules/hermesvm/include"
    INTERFACE_LINK_LIBRARIES ""
)
endif()

