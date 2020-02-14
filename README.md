# Variant Management Sample Application

*This project may also be called the Configurator Services Sample Application.*

The Variant Management Sample Application shows developers how they can use the Configurator Services API to create custom variant management applications. 

The Variant Management Sample Application showcases the use of Configurator Services to application developers and users interested in variant management. The sample application allows product variability to be managed and applied to product breakdown structures and allows these configurable 150% breakdown structures to be resolved when a set of options are selected. For more information on the Configurator Services API, check out the [Configurator Services Programmer's Guide](./Documentation/Aras%20Innovator%2012.0%20-%20Configurator%20Services%20Programmers%20Guide.pdf).

This sample application is an Aras Community Project. It is not a standard product, and should not be deployed to production as-is. The purpose of the sample application is to demonstrate the Configurator Services API capabilities so that custom applications can be built to address specific business requirements and processes.

Sample data is provided along with the sample application. Loading the sample data is optional. The purpose of the sample data is to help follow [the documentation](./Documentation/Aras%20Innovator%2012.0%20-%20Variant%20Management%20Sample%20Application.pdf) and provide ideas on how variability definition and breakdown structures can be organized and connected to each other. 

## History

Release | Notes
--------|--------
[2.0.0](https://github.com/ArasLabs/vm-sample-application/releases/tag/v2.0.0) | Variability Definition is separated from Breakdown Structure, and managed independently. This makes it possible to use the same variability definition on any structure. Note: This data model is different from the previous version.
[12.0 R2.0](https://github.com/ArasLabs/vm-sample-application/releases/tag/12.0R2.0) | Updated to support Aras 12.0 SP1
[12.0.0.1](https://github.com/ArasLabs/vm-sample-application/releases/tag/12.0.0.1) | Updated to support Aras 12.0 SP0.
[11.0.15.1](https://github.com/ArasLabs/vm-sample-application/releases/tag/11.0.15.1) | Updated to support Aras 11.0 SP15.
[11.0.14.1](https://github.com/ArasLabs/vm-sample-application/releases/tag/11.0.14.1) | Updated to support Aras 11.0 SP14. 
[11.0.12.1](https://github.com/ArasLabs/vm-sample-application/releases/tag/11.0.12.1) | First release.

#### Supported Aras Versions

Project | Aras
--------|------
[2.0.0](https://github.com/ArasLabs/vm-sample-application/releases/tag/v2.0.0) | 12.0 SP4
[12.0 R2.0](https://github.com/ArasLabs/vm-sample-application/releases/tag/12.0R2.0) | 12.0 SP1
[12.0.0.1](https://github.com/ArasLabs/vm-sample-application/releases/tag/12.0.0.1) | 12.0 SP0
[11.0.15.1](https://github.com/ArasLabs/vm-sample-application/releases/tag/11.0.15.1) | 11.0 SP15
[11.0.14.1](https://github.com/ArasLabs/vm-sample-application/releases/tag/11.0.14.1) | 11.0 SP14
[11.0.12.1](https://github.com/ArasLabs/vm-sample-application/releases/tag/11.0.12.1) | 11.0 SP12

## Installation

#### Important!
**Always back up your code tree and database before applying an import package or code tree patch!**

### Pre-requisites

1. Aras Innovator installed (version 12.0 SP4)
2. [Aras Update](http://www.aras.com/support/downloads/) installed (version 1.6+)
3. Variant Management Sample Application package

### Install Steps

1. Run Aras Update.
2. Select **Local** in the sidebar.
3. Click **Add package reference** and select the VM Sample Application installation package.
4. Select the newly added package from the list and click **Install**.
5. Select the components you want to install and click **Next**.
    * Aras Innovator Code Tree Updates
    * Aras Innovator Database Updates
    * Sample Data Actions (Optional)
6. Choose **Detailed Logging** and click **Next**.
7. Enter the required parameters for the target Aras Innovator instance. Which parameters are required varies based on which components you have selected to install.
    * When selecting the install path for your Innovator instance, be sure to select the Innovator subfolder. 
    * Example: If your Innovator instance is installed in `C:\Program Files (x86)\Aras\120SP4`, select `C:\Program Files (x86)\Aras\120SP4\Innovator`.
8. Click **Install** to begin installing the package.
9. When the package finishes installing, close Aras Update.

### Load Sample Data (Optional)

1. Log into Innovator as admin.
2. In the main menu, select **Actions > Load Variant Management Sample Data**.
3. When prompted, enter the file path of the Variant Management Sample Application package.
    * Example: If the Variant Management Sample Application package was downloaded and unzipped to `C:\VMSample`, enter `C:\VMSample`.
4. Running the **Load Variant Management Sample Data** action will overwrite any variant sample data loaded by a previous execution. Click **Ok** in the warning prompt to continue loading.
5. After the load completes, navigate to **Variant Management** in the TOC to confirm that instances of Features, Options, Breakdown Items, Variability Items, and Variable Components have been added.

## Usage

For information on using the sample application, view [the documentation](./Documentation/Configurator%20Services%20Sample%20Application.pdf).

## Contributing

1. Fork it!
2. Create your feature branch: `git checkout -b my-new-feature`
3. Commit your changes: `git commit -am 'Add some feature'`
4. Push to the branch: `git push origin my-new-feature`
5. Submit a pull request.

For more information on contributing to this project, another Aras Labs project, or any Aras Community project, shoot us an email at araslabs@aras.com.

## Credits

Sample application created by Aras Development.

## License

Aras Labs projects are published to GitHub under the MIT license. See the [LICENSE file](./LICENSE.md) for license rights and limitations.