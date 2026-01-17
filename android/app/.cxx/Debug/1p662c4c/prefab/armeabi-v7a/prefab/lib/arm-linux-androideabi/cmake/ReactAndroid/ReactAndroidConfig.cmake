if(NOT TARGET ReactAndroid::hermestooling)
add_library(ReactAndroid::hermestooling SHARED IMPORTED)
set_target_properties(ReactAndroid::hermestooling PROPERTIES
    IMPORTED_LOCATION "/home/yk/.gradle/caches/8.13/transforms/a5eb6650aace0b6e4adedd8cab5789b7/transformed/react-android-0.83.1-debug/prefab/modules/hermestooling/libs/android.armeabi-v7a/libhermestooling.so"
    INTERFACE_INCLUDE_DIRECTORIES "/home/yk/.gradle/caches/8.13/transforms/a5eb6650aace0b6e4adedd8cab5789b7/transformed/react-android-0.83.1-debug/prefab/modules/hermestooling/include"
    INTERFACE_LINK_LIBRARIES ""
)
endif()

if(NOT TARGET ReactAndroid::jsi)
add_library(ReactAndroid::jsi SHARED IMPORTED)
set_target_properties(ReactAndroid::jsi PROPERTIES
    IMPORTED_LOCATION "/home/yk/.gradle/caches/8.13/transforms/a5eb6650aace0b6e4adedd8cab5789b7/transformed/react-android-0.83.1-debug/prefab/modules/jsi/libs/android.armeabi-v7a/libjsi.so"
    INTERFACE_INCLUDE_DIRECTORIES "/home/yk/.gradle/caches/8.13/transforms/a5eb6650aace0b6e4adedd8cab5789b7/transformed/react-android-0.83.1-debug/prefab/modules/jsi/include"
    INTERFACE_LINK_LIBRARIES ""
)
endif()

if(NOT TARGET ReactAndroid::reactnative)
add_library(ReactAndroid::reactnative SHARED IMPORTED)
set_target_properties(ReactAndroid::reactnative PROPERTIES
    IMPORTED_LOCATION "/home/yk/.gradle/caches/8.13/transforms/a5eb6650aace0b6e4adedd8cab5789b7/transformed/react-android-0.83.1-debug/prefab/modules/reactnative/libs/android.armeabi-v7a/libreactnative.so"
    INTERFACE_INCLUDE_DIRECTORIES "/home/yk/.gradle/caches/8.13/transforms/a5eb6650aace0b6e4adedd8cab5789b7/transformed/react-android-0.83.1-debug/prefab/modules/reactnative/include"
    INTERFACE_LINK_LIBRARIES ""
)
endif()

