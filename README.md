# Configurator Services Sample Application

A sample application that demonstrates how to use the Configurator Service to manage variants.

<!-- TODO: Add documentation on Configurator Services -->

## History

Release | Notes
--------|--------
[v1.0.0](https://github.com/ArasLabs/cs-sample-application/releases/tag/v1.0.0) | First release.

#### Supported Aras Versions

Project | Aras
--------|------
[v1.0.0](https://github.com/ArasLabs/cs-sample-application/releases/tag/v1.0.0) | 11.0 SP12

## Installation

#### Important!
**Always back up your code tree and database before applying an import package or code tree patch!**

### Pre-requisites

1. Aras Innovator installed (version 11.0 SP12)
2. [Aras Update](http://www.aras.com/support/downloads/) installed (version 1.5+)
3. Variant Management Sample Application package

### Install Steps

<!-- TODO: Add screenshot(s) -->

1. Run Aras Update.
2. Select **Local** in the sidebar.
3. Click **Add package reference** and select the VM Sample Application installation package.
4. Select the newly added package from the list and click **Install**.
5. Select the components you want to install and click **Next**.
    * Aras Innovator Code Tree Updates
    * Aras Innovator Database Updates
    * Sample Data Actions (Optional)
6. Choose **Detailed Logging** and click **Next**.
7. Click **Install** to begin installing the package.
8. When the package finishes installing, close Aras Update.

### Load Sample Data (Optional)

1. Log into Innovator as admin.
2. In the main menu, select **Actions > Load Variant Sample Data**.
3. When prompted, enter the file path of the Variant Management Sample Application package.
    * Example: If the Variant Management Sample Application package was downloaded and unzipped to `C:\VMSample`, enter `C:\VMSample`.
4. Running the **Load Variant Sample Data** action will overwrite any variant sample data loaded by a previous execution. Click **Ok** in the warning prompt to continue loading.
5. After the load completes, navigate to **Configurator > Generic Item** in the TOC to confirm that the Generic Items have been added.

## Usage

<!-- TODO -->

## Contributing

1. Fork it!
2. Create your feature branch: `git checkout -b my-new-feature`
3. Commit your changes: `git commit -am 'Add some feature'`
4. Push to the branch: `git push origin my-new-feature`
5. Submit a pull request

For more information on contributing to this project, another Aras Labs project, or any Aras Community project, shoot us an email at araslabs@aras.com.

## Credits

Sample application created by Aras Development.

## License

Aras Labs projects are published to Github under the MIT license. See the [LICENSE file](./LICENSE.md) for license rights and limitations.