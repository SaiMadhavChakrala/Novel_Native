package com.novelnative.backend;

import com.novelnative.backend.config.AppProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
@ConfigurationPropertiesScan(basePackageClasses = AppProperties.class)
public class NovelNativeBackendApplication {

    public static void main(String[] args) {
        SpringApplication.run(NovelNativeBackendApplication.class, args);
    }
}
