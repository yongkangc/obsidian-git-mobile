if(NOT TARGET fbjni::fbjni)
add_library(fbjni::fbjni SHARED IMPORTED)
set_target_properties(fbjni::fbjni PROPERTIES
    IMPORTED_LOCATION "/home/yk/.gradle/caches/8.13/transforms/5a4fa8ef8d2ea5d84d321a2c8a409ee0/transformed/fbjni-0.7.0/prefab/modules/fbjni/libs/android.x86_64/libfbjni.so"
    INTERFACE_INCLUDE_DIRECTORIES "/home/yk/.gradle/caches/8.13/transforms/5a4fa8ef8d2ea5d84d321a2c8a409ee0/transformed/fbjni-0.7.0/prefab/modules/fbjni/include"
    INTERFACE_LINK_LIBRARIES ""
)
endif()

