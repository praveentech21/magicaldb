<?php

// Create connection
$conn = new mysqli("localhost", "root", "", "magicaldb");

// Check connection
if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}

// Example query
if (isset($_GET['genid'])) {
    // Get the genid from the GET request
    $gene = $_GET['genid'];

    // Assuming $conn is your database connection
    // If $gene is not empty, select rows where gene1 or gene2 matches the input gene
    $sql = "SELECT * FROM data WHERE gene1='$gene' ";

    // Execute your SQL query and process the result as needed
    $result = $conn->query($sql);

    $nodes = array();
    $edges = array();
    $edge_id_counter = 1;

    if ($result->num_rows > 0) {
        // Output data of each row
        while ($row = $result->fetch_assoc()) {
            // Node for gene1
            $nodes[] = array(
                "data" => array(
                    "id" => $row['gene1'],
                    "selected" => false,
                    "NodeType" => "miRNA",
                    "Type" => "miRNA",
                    "Quality" => 200,
                    "name" => $row['gene1']
                ),
                "position" => array(
                    "x" => rand(0, 300000),
                    "y" => rand(0, 300000)
                ),
                "selected" => false
            );

            // Node for gene2
            $nodes[] = array(
                "data" => array(
                    "id" => $row['gene2'],
                    "selected" => false,
                    "NodeType" => "miRNA",
                    "Type" => "miRNA",
                    "Quality" => 200,
                    "name" => $row['gene2']
                ),
                "position" => array(
                    "x" => rand(0, 300000),
                    "y" => rand(0, 300000)
                ),
                "selected" => false
            );

            // Edge from gene1 to gene2
            $edges[] = array(
                "data" => array(
                    "id" => "D" . $edge_id_counter,
                    "selected" => false,
                    "source" => $row['gene1'],
                    "target" => $row['gene2'],
                    "interaction" => "cc"
                ),
                "selected" => false
            );
            $edge_id_counter++;

            // Edge from gene2 to gene1
            $edges[] = array(
                "data" => array(
                    "id" => "E" . $edge_id_counter,
                    "selected" => false,
                    "source" => $row['gene2'],
                    "target" => $row['gene1'],
                    "interaction" => "cc"
                )
            );
            $edge_id_counter++;
        }
    } else {
        echo "0 results";
        // Set the value of the search input to an empty string
        $search_value = '';
    }

    // Close connection
    $conn->close();

    // Convert data to JSON format
    $json_data = array(
        "format_version" => "1.0",
        "generated_by" => "cytoscape-3.2.0",
        "target_cytoscapejs_version" => "~2.1",
        "data" => array(
            "selected" => true,
            "__Annotations" => array(),
            "shared_name" => "I-RegulonNetwork",
            "SUID" => 52,
            "name" => "I-RegulonNetwork"
        ),
        "elements" => array(
            "nodes" => $nodes,
            "edges" => $edges
        )
    );

    // Save JSON data to a file
    $output_file_path = 'data.json';
    // Remove old data.json file if it exists
    if (file_exists($output_file_path)) {
        unlink($output_file_path);
    }
    file_put_contents($output_file_path, json_encode($json_data, JSON_PRETTY_PRINT));

    // Output JSON data
    echo json_encode($json_data);
} else {
    echo "Gene input not provided.";
}